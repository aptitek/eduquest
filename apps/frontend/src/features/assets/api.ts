import { BACKEND_BASE_URL } from '../auth/useAuth';

import { throwApiResponseError } from '../errors/api';
export type AssetKind = 'avatar' | 'school-logo' | 'guild-icon';

type AssetUploadResponse =
  | {
      success: true;
      key: string;
      url: string;
      contentType: string;
    }
  | {
      success: false;
      error?: string;
    };

export async function uploadAsset(
  token: string,
  kind: AssetKind,
  file: File,
  entityId?: string
) {
  const formData = new FormData();
  formData.set('file', file);
  if (entityId) formData.set('entityId', entityId);

  const response = await fetch(`${BACKEND_BASE_URL}/api/assets/${kind}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = (await response.json()) as AssetUploadResponse;

  if (!response.ok || !data.success) {
    throwApiResponseError(response, data, 'Asset upload failed.');
  }

  return data;
}
