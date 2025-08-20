#!/usr/bin/env python3
"""
Context-Based Chatbot using LangChain
Integrates with MERN stack for document analysis and conversational AI
"""

import os
import sys
import json
import argparse
from typing import List, Dict, Any, Optional
import tempfile
import shutil
from pathlib import Path
import io
import boto3
from botocore.exceptions import NoCredentialsError, ClientError

# Core LangChain imports
from langchain.document_loaders import (
    PyPDFLoader,
    TextLoader,
    CSVLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredExcelLoader
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.embeddings import GoogleGenerativeAIEmbeddings
from langchain.llms import GoogleGenerativeAI
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain.memory import ConversationBufferWindowMemory
from langchain.chains import ConversationalRetrievalChain
from langchain.schema import Document

# Environment and configuration
from dotenv import load_dotenv
load_dotenv()

class ContextChatbot:
    def __init__(self, google_api_key: str = None, model_name: str = "gemini-pro", 
                 aws_access_key: str = None, aws_secret_key: str = None, aws_region: str = None):
        """
        Initialize the Context-Based Chatbot
        
        Args:
            google_api_key: Google AI API key
            model_name: Model name to use (default: gemini-pro)
            aws_access_key: AWS access key for S3
            aws_secret_key: AWS secret key for S3
            aws_region: AWS region (default: us-east-1)
        """
        self.google_api_key = google_api_key or os.getenv("GOOGLE_API_KEY")
        self.model_name = model_name
        self.vectorstore = None
        self.qa_chain = None
        self.memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            k=10  # Keep last 10 exchanges
        )
        
        # AWS S3 Configuration
        self.aws_access_key = aws_access_key or os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = aws_secret_key or os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = aws_region or os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        
        if not self.google_api_key:
            raise ValueError("Google API Key is required. Set GOOGLE_API_KEY environment variable.")
        
        # Initialize AWS S3 client
        if self.aws_access_key and self.aws_secret_key:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                region_name=self.aws_region
            )
            print("✅ AWS S3 client initialized successfully")
        else:
            # Try using default AWS credentials (IAM roles, profiles, etc.)
            try:
                self.s3_client = boto3.client('s3', region_name=self.aws_region)
                print("✅ AWS S3 client initialized with default credentials")
            except NoCredentialsError:
                self.s3_client = None
                print("⚠️  AWS credentials not found. S3 functionality will be disabled.")
        
        # Initialize embeddings and LLM
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=self.google_api_key
        )
        
        self.llm = GoogleGenerativeAI(
            model=self.model_name,
            google_api_key=self.google_api_key,
            temperature=0.3
        )
        
        print("✅ Chatbot initialized successfully")

    def download_from_s3(self, s3_paths: List[str], temp_dir: str) -> List[str]:
        """
        Download files from AWS S3 to temporary directory
        
        Args:
            s3_paths: List of S3 paths in format "bucket-name/key" or "s3://bucket-name/key"
            temp_dir: Temporary directory path
            
        Returns:
            List of local file paths
        """
        if not self.s3_client:
            raise ValueError("S3 client not initialized. Please check AWS credentials.")
        
        local_files = []
        
        for s3_path in s3_paths:
            try:
                # Parse S3 path
                if s3_path.startswith('s3://'):
                    s3_path = s3_path[5:]  # Remove 's3://' prefix
                
                if '/' not in s3_path:
                    print(f"⚠️  Invalid S3 path format: {s3_path}")
                    continue
                
                bucket_name, key = s3_path.split('/', 1)
                
                # Get file info from S3
                try:
                    response = self.s3_client.head_object(Bucket=bucket_name, Key=key)
                    file_size = response['ContentLength']
                    print(f"📁 Found S3 file: {key} ({file_size} bytes)")
                except ClientError as e:
                    print(f"❌ File not found in S3: {s3_path} - {str(e)}")
                    continue
                
                # Generate local filename
                filename = os.path.basename(key)
                if not filename:
                    filename = f"s3_file_{len(local_files)}.bin"
                
                local_path = os.path.join(temp_dir, filename)
                
                # Download file
                print(f"⬇️  Downloading {s3_path} to {local_path}")
                self.s3_client.download_file(bucket_name, key, local_path)
                
                local_files.append(local_path)
                print(f"✅ Downloaded: {filename}")
                
            except ClientError as e:
                print(f"❌ AWS S3 error for {s3_path}: {str(e)}")
                continue
            except Exception as e:
                print(f"❌ Error downloading {s3_path}: {str(e)}")
                continue
        
        return local_files

    def list_s3_objects(self, bucket_name: str, prefix: str = "", max_keys: int = 100) -> List[Dict]:
        """
        List objects in S3 bucket with optional prefix filter
        
        Args:
            bucket_name: S3 bucket name
            prefix: Key prefix filter (optional)
            max_keys: Maximum number of objects to return
            
        Returns:
            List of object information dictionaries
        """
        if not self.s3_client:
            raise ValueError("S3 client not initialized. Please check AWS credentials.")
        
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            objects = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    objects.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat(),
                        's3_path': f"{bucket_name}/{obj['Key']}"
                    })
            
            print(f"📋 Found {len(objects)} objects in s3://{bucket_name}/{prefix}")
            return objects
            
        except ClientError as e:
            print(f"❌ Error listing S3 objects: {str(e)}")
            return []

    def load_documents(self, file_paths: List[str], s3_paths: List[str] = None) -> List[Document]:
        """
        Load documents from local files and/or AWS S3
        
        Args:
            file_paths: List of local file paths
            s3_paths: List of S3 paths (optional)
            
        Returns:
            List of LangChain Document objects
        """
        documents = []
        temp_dir = None
        
        try:
            # Handle S3 files if provided
            if s3_paths and self.s3_client:
                temp_dir = tempfile.mkdtemp()
                print(f"📁 Created temporary directory: {temp_dir}")
                
                # Download S3 files to temporary directory
                downloaded_files = self.download_from_s3(s3_paths, temp_dir)
                file_paths.extend(downloaded_files)
            
            # Process all files (local + downloaded from S3)
            for file_path in file_paths:
                try:
                    file_path = Path(file_path)
                    if not file_path.exists():
                        print(f"⚠️  File not found: {file_path}")
                        continue
                    
                    extension = file_path.suffix.lower()
                    
                    if extension == '.pdf':
                        loader = PyPDFLoader(str(file_path))
                    elif extension == '.txt':
                        loader = TextLoader(str(file_path), encoding='utf-8')
                    elif extension == '.csv':
                        loader = CSVLoader(str(file_path))
                    elif extension in ['.doc', '.docx']:
                        loader = UnstructuredWordDocumentLoader(str(file_path))
                    elif extension in ['.xls', '.xlsx']:
                        loader = UnstructuredExcelLoader(str(file_path))
                    else:
                        print(f"⚠️  Unsupported file format: {extension}")
                        continue
                    
                    docs = loader.load()
                    
                    # Add S3 source information to metadata if applicable
                    if temp_dir and str(file_path).startswith(temp_dir):
                        for doc in docs:
                            doc.metadata['source_type'] = 's3'
                            # Try to find original S3 path
                            for s3_path in (s3_paths or []):
                                if os.path.basename(s3_path) == file_path.name:
                                    doc.metadata['s3_path'] = s3_path
                                    break
                    
                    documents.extend(docs)
                    print(f"✅ Loaded {len(docs)} documents from {file_path.name}")
                    
                except Exception as e:
                    print(f"❌ Error loading {file_path}: {str(e)}")
                    continue
        
        finally:
            # Cleanup temporary directory
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
                print(f"🧹 Cleaned up temporary directory: {temp_dir}")
        
        return documents

    def process_documents(self, documents: List[Document]):
        """
        Process documents and create vector store
        
        Args:
            documents: List of Document objects
        """
        if not documents:
            print("❌ No documents to process")
            return
        
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        
        texts = text_splitter.split_documents(documents)
        print(f"📄 Split documents into {len(texts)} chunks")
        
        # Create vector store
        self.vectorstore = FAISS.from_documents(texts, self.embeddings)
        print("✅ Vector store created successfully")
        
        # Create custom prompt template
        custom_prompt = PromptTemplate(
            template="""You are an AI assistant that answers questions based on the provided context. 
            Use the following context to answer the user's question. If the answer is not in the context, 
            say that you don't have enough information to answer the question.

            Context: {context}
            Chat History: {chat_history}
            Question: {question}

            Please provide a detailed and helpful answer based on the context:""",
            input_variables=["context", "chat_history", "question"]
        )
        
        # Create conversational retrieval chain
        self.qa_chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vectorstore.as_retriever(search_kwargs={"k": 5}),
            memory=self.memory,
            combine_docs_chain_kwargs={"prompt": custom_prompt},
            return_source_documents=True,
            verbose=True
        )

    def query(self, question: str) -> Dict[str, Any]:
        """
        Query the chatbot with a question
        
        Args:
            question: User's question
            
        Returns:
            Dictionary containing answer and metadata
        """
        if not self.qa_chain:
            return {
                "answer": "Please upload documents first before asking questions.",
                "sources": [],
                "error": "No documents loaded"
            }
        
        try:
            # Get response from the chain
            response = self.qa_chain({"question": question})
            
            # Extract source information
            sources = []
            if "source_documents" in response:
                for doc in response["source_documents"]:
                    source_info = {
                        "content": doc.page_content[:200] + "...",
                        "metadata": doc.metadata
                    }
                    sources.append(source_info)
            
            return {
                "answer": response["answer"],
                "sources": sources,
                "question": question
            }
            
        except Exception as e:
            return {
                "answer": f"An error occurred while processing your question: {str(e)}",
                "sources": [],
                "error": str(e)
            }

    def reset_conversation(self):
        """Reset conversation memory"""
        self.memory.clear()
        print("🔄 Conversation history cleared")

    def save_vectorstore(self, path: str):
        """Save vector store to disk"""
        if self.vectorstore:
            self.vectorstore.save_local(path)
            print(f"💾 Vector store saved to {path}")

    def load_vectorstore(self, path: str):
        """Load vector store from disk"""
        try:
            self.vectorstore = FAISS.load_local(path, self.embeddings)
            
            # Recreate the QA chain
            custom_prompt = PromptTemplate(
                template="""You are an AI assistant that answers questions based on the provided context. 
                Use the following context to answer the user's question. If the answer is not in the context, 
                say that you don't have enough information to answer the question.

                Context: {context}
                Chat History: {chat_history}
                Question: {question}

                Please provide a detailed and helpful answer based on the context:""",
                input_variables=["context", "chat_history", "question"]
            )
            
            self.qa_chain = ConversationalRetrievalChain.from_llm(
                llm=self.llm,
                retriever=self.vectorstore.as_retriever(search_kwargs={"k": 5}),
                memory=self.memory,
                combine_docs_chain_kwargs={"prompt": custom_prompt},
                return_source_documents=True,
                verbose=True
            )
            
            print(f"📚 Vector store loaded from {path}")
        except Exception as e:
            print(f"❌ Error loading vector store: {str(e)}")

def main():
    """Main function for command line interface"""
    parser = argparse.ArgumentParser(description="Context-Based Chatbot using LangChain with S3 support")
    parser.add_argument("--action", required=True, choices=["load", "query", "reset", "list-s3"], 
                       help="Action to perform")
    parser.add_argument("--files", nargs="*", help="Local files to load (for load action)")
    parser.add_argument("--s3-paths", nargs="*", help="S3 paths to load (format: bucket/key or s3://bucket/key)")
    parser.add_argument("--s3-bucket", help="S3 bucket name for listing objects")
    parser.add_argument("--s3-prefix", help="S3 key prefix for filtering (optional)")
    parser.add_argument("--question", help="Question to ask (for query action)")
    parser.add_argument("--api-key", help="Google API Key")
    parser.add_argument("--aws-access-key", help="AWS Access Key ID")
    parser.add_argument("--aws-secret-key", help="AWS Secret Access Key")
    parser.add_argument("--aws-region", help="AWS Region", default="us-east-1")
    parser.add_argument("--output", help="Output format", choices=["json", "text"], default="json")
    
    args = parser.parse_args()
    
    try:
        # Initialize chatbot
        chatbot = ContextChatbot(
            google_api_key=args.api_key,
            aws_access_key=args.aws_access_key,
            aws_secret_key=args.aws_secret_key,
            aws_region=args.aws_region
        )
        
        if args.action == "load":
            local_files = args.files or []
            s3_paths = args.s3_paths or []
            
            if not local_files and not s3_paths:
                print("❌ No files or S3 paths provided for loading")
                sys.exit(1)
            
            # Load and process documents
            documents = chatbot.load_documents(local_files, s3_paths)
            chatbot.process_documents(documents)
            
            result = {
                "status": "success",
                "message": f"Successfully loaded {len(documents)} documents",
                "documents_count": len(documents),
                "local_files": len(local_files),
                "s3_files": len(s3_paths or [])
            }
            
        elif args.action == "query":
            if not args.question:
                print("❌ No question provided")
                sys.exit(1)
            
            # Query the chatbot
            result = chatbot.query(args.question)
            result["status"] = "success"
            
        elif args.action == "reset":
            chatbot.reset_conversation()
            result = {
                "status": "success",
                "message": "Conversation history cleared"
            }
            
        elif args.action == "list-s3":
            if not args.s3_bucket:
                print("❌ S3 bucket name required for list-s3 action")
                sys.exit(1)
            
            objects = chatbot.list_s3_objects(
                args.s3_bucket, 
                args.s3_prefix or "", 
                100
            )
            
            result = {
                "status": "success",
                "bucket": args.s3_bucket,
                "prefix": args.s3_prefix or "",
                "objects": objects,
                "count": len(objects)
            }
        
        # Output result
        if args.output == "json":
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            if "answer" in result:
                print(f"Answer: {result['answer']}")
            if "message" in result:
                print(result["message"])
            if "objects" in result:
                print(f"Found {len(result['objects'])} objects:")
                for obj in result['objects']:
                    print(f"  - {obj['key']} ({obj['size']} bytes)")
                
    except Exception as e:
        error_result = {
            "status": "error",
            "error": str(e),
            "message": f"An error occurred: {str(e)}"
        }
        
        if args.output == "json":
            print(json.dumps(error_result, indent=2))
        else:
            print(f"❌ Error: {str(e)}")
        
        sys.exit(1)

if __name__ == "__main__":
    main()