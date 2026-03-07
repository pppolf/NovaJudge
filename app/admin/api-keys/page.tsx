
import { getApiKeys } from "./actions";
import ApiKeyManager from "./ApiKeyManager";

export default async function ApiKeysPage() {
  const keys = await getApiKeys();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
      </div>

      <p className="text-gray-600">
        Manage API keys for accessing external services. Treat these keys like
        passwords.
      </p>

      <ApiKeyManager initialKeys={keys} />
    </div>
  );
}
