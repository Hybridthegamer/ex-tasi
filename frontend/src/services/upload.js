const CLOUD_NAME    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

/**
 * Upload a file to Cloudinary with progress tracking
 * @param {File} file
 * @param {string} path - Used as a folder tag (e.g. 'quiz-media/quiz123/')
 * @param {function} onProgress - Called with 0–100
 * @returns {Promise<{url: string, mediaType: string}>}
 */
export const uploadFile = (file, path, onProgress) => {
  return new Promise((resolve, reject) => {
    const folder   = path.replace(/\/$/, '');
    const formData = new FormData();
    formData.append('file',           file);
    formData.append('upload_preset',  UPLOAD_PRESET);
    formData.append('folder',         folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        const data      = JSON.parse(xhr.responseText);
        const mediaType = file.type.startsWith('image/') ? 'image'
          : file.type.startsWith('video/')               ? 'video'
          : file.type.startsWith('audio/')               ? 'audio'
          :                                                'file';
        resolve({ url: data.secure_url, path: data.public_id, mediaType });
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed')));
    xhr.open('POST', UPLOAD_URL);
    xhr.send(formData);
  });
};

/**
 * Delete is handled server-side with Cloudinary Admin API.
 * From the browser we just no-op — the backend can clean up
 * orphaned assets separately if needed.
 */
export const deleteFile = async (publicId) => {
  console.warn('deleteFile: call your backend to delete Cloudinary asset:', publicId);
};

/**
 * Upload multiple files concurrently
 */
export const uploadMultiple = async (files, path, onProgress) => {
  const total         = files.length;
  let completedCount  = 0;

  const results = await Promise.all(
    files.map((file) =>
      uploadFile(file, path, (p) => {
        if (p === 100) completedCount++;
        if (onProgress) onProgress(Math.round(((completedCount + p / 100) / total) * 100));
      })
    )
  );

  return results;
};