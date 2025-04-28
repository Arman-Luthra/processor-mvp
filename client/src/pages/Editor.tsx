import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import NotionEditor from "@/components/NotionEditor";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Document } from "@shared/schema";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const documentId = id ? parseInt(id) : undefined;
  
  // Create a new document if no id is provided
  const [isCreatingDocument, setIsCreatingDocument] = useState(!documentId);
  const [newDocument, setNewDocument] = useState<Document | null>(null);

  const { data: document, isLoading, error } = useQuery<Document>({
    queryKey: documentId ? [`/api/documents/${documentId}`] : null,
    enabled: !!documentId && !isCreatingDocument,
  });

  // Create a new document mutation
  const createDocumentMutation = useMutation({
    mutationFn: async (data: { title: string; content: any[] }) => {
      const response = await apiRequest("POST", "/api/documents", {
        ...data,
        userId: 1, // Default user ID for demo purposes
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setNewDocument(data);
      setIsCreatingDocument(false);
      toast({
        title: "Success",
        description: "Document created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create document: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    },
  });

  // Update document mutation
  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Document> }) => {
      const response = await apiRequest("PATCH", `/api/documents/${id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${data.id}`] });
      toast({
        title: "Saved",
        description: "Document saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save document: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    },
  });

  // Create a document on initial load if no ID is provided
  useEffect(() => {
    if (isCreatingDocument && !newDocument && !createDocumentMutation.isPending) {
      createDocumentMutation.mutate({
        title: "Untitled",
        content: [],
      });
    }
  }, [isCreatingDocument, newDocument, createDocumentMutation]);

  // Handle error states
  if (error && !isCreatingDocument) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : String(error)}
          </p>
          <button
            className="px-4 py-2 bg-primary text-white rounded-md"
            onClick={() => window.location.href = "/"}
          >
            Create New Document
          </button>
        </div>
      </div>
    );
  }

  // Display loading state
  if ((isLoading && !newDocument) || (isCreatingDocument && createDocumentMutation.isPending)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading editor...</p>
        </div>
      </div>
    );
  }

  // Handle document save
  const handleSave = (title: string, content: any[]) => {
    const currentDocument = newDocument || document;
    if (currentDocument) {
      updateDocumentMutation.mutate({
        id: currentDocument.id,
        data: {
          title,
          content,
          updatedAt: new Date(),
        },
      });
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <NotionEditor 
        initialTitle={newDocument?.title || document?.title || "Untitled"}
        initialContent={newDocument?.content || document?.content || []}
        onSave={handleSave}
        isSaving={updateDocumentMutation.isPending}
      />
    </div>
  );
}
