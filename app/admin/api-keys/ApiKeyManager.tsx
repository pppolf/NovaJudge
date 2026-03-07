"use client";

import { useState } from "react";
import { createApiKey, deleteApiKey, toggleApiKey } from "./actions";
import { toast } from "sonner";
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  PowerIcon,
} from "@heroicons/react/24/outline";
import ConfirmModal from "@/components/admin/ConfirmModal";

interface ApiKey {
  id: string;
  key: string;
  name: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
  isEnabled: boolean;
}

export default function ApiKeyManager({
  initialKeys,
}: {
  initialKeys: ApiKey[];
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      await toggleApiKey(id, !currentStatus);
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, isEnabled: !currentStatus } : k,
        ),
      );
      toast.success(`API Key ${!currentStatus ? "enabled" : "disabled"}`);
    } catch (error) {
      console.log(error);
      toast.error("Failed to update API Key status");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await createApiKey(newKeyName);
      if (res.success) {
        toast.success("API Key created successfully");
        setNewKeyName("");
        // 简单刷新页面或者手动更新列表 (这里简单起见刷新页面)
        window.location.reload();
      }
    } catch (error) {
      console.log(error);
      toast.error("Failed to create API Key");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingKeyId) return;
    try {
      await deleteApiKey(deletingKeyId);
      toast.success("API Key deleted");
      setKeys((prev) => prev.filter((k) => k.id !== deletingKeyId));
    } catch (error) {
      console.log(error);
      toast.error("Failed to delete API Key");
    } finally {
      setDeletingKeyId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={!!deletingKeyId}
        title="Revoke API Key"
        message="Are you sure you want to revoke this API key? Any applications using it will immediately stop working."
        confirmText="Revoke"
        onConfirm={handleDelete}
        onCancel={() => setDeletingKeyId(null)}
        isDestructive
      />

      {/* Create Form */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Generate New Key
        </h3>
        <form onSubmit={handleCreate} className="flex gap-4">
          <input
            type="text"
            placeholder="Key Name (e.g. My Script)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={isCreating}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors cursor-pointer"
          >
            {isCreating ? "Generating..." : "Generate"}
          </button>
        </form>
      </div>

      {/* Key List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <KeyIcon className="w-5 h-5 text-gray-500" />
          <h3 className="font-medium text-gray-700">Active API Keys</h3>
        </div>

        {keys.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No API keys found. Generate one to get started.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {keys.map((key) => (
              <li
                key={key.id}
                className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {key.name || "Untitled"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        key.isEnabled
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {key.isEnabled ? "Active" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded w-fit">
                    {key.key}
                    <button
                      onClick={() => copyToClipboard(key.key)}
                      className="text-gray-400 hover:text-gray-600"
                      title="Copy"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt && (
                      <span className="ml-4">
                        Last used: {new Date(key.lastUsedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(key.id, key.isEnabled)}
                    className={`p-2 rounded-full transition-colors cursor-pointer ${
                      key.isEnabled
                        ? "text-green-600 hover:bg-green-50"
                        : "text-gray-400 hover:bg-gray-50"
                    }`}
                    title={key.isEnabled ? "Disable Key" : "Enable Key"}
                  >
                    <PowerIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDeletingKeyId(key.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                    title="Revoke Key"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
