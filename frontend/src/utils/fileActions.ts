
/**
 * Processes an input file, handling HEIC conversion if necessary.
 * @param file The input file from a file input or drag-drop.
 * @returns A Promise resolving to a JPEG File object suitable for usage.
 */
export async function processImageFile(file: File): Promise<File> {
    // Check for HEIC
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
        try {
            // Add 15s timeout to prevent infinite hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("HEIC conversion timed out")), 15000)
            );

            const conversionPromise = (async () => {
                const heic2any = (await import('heic2any')).default;
                const convertedBlob = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: 0.8
                });
                return Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
            })();

            const blob = await Promise.race([conversionPromise, timeoutPromise]) as Blob;
            return new File([blob], file.name.replace(/\.heic$/i, ".jpg"), { type: 'image/jpeg' });
        } catch (error) {
            console.error("HEIC Conversion failed or timed out", error);
            // If conversion fails, return original file (best effort) or throw
            // Returning original lets the UI try to handle it (though it might lack preview)
            // But throwing allows UI to catch and use original as fallback explicitly
            throw error;
        }
    }

    // Skip processing for small images (saves memory & CPU, avoids canvas bugs)
    if (file.size < 512 * 1024 && !file.name.toLowerCase().endsWith('.heic')) {
        console.log(`[fileActions] Skipping compression for small file: ${file.size / 1024}KB`);
        return file;
    }

    // Generic Image Resizing & Compression
    return new Promise((resolve, reject) => {
        // Safety timeout for standard images too (10s)
        const loadTimeout = setTimeout(() => {
            console.warn("Image load timed out, returning original");
            resolve(file); // Fallback to original rather than failing
        }, 10000);

        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
            clearTimeout(loadTimeout);
            URL.revokeObjectURL(objectUrl);

            try {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 1280;
                const MAX_HEIGHT = 1280;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error("Canvas context failed");

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        console.log(`Resized image: ${file.size / 1024}KB -> ${blob.size / 1024}KB`);
                        resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: "image/jpeg" }));
                    } else {
                        // Blob failed, resolve original
                        console.warn("Blob generation failed, using original");
                        resolve(file);
                    }
                }, 'image/jpeg', 0.8);
            } catch (e) {
                console.error("Canvas Resize Error", e);
                // Hard fallback to original file if canvas crashes (e.g. out of memory)
                resolve(file);
            }
        };

        img.onerror = (err) => {
            clearTimeout(loadTimeout);
            URL.revokeObjectURL(objectUrl);
            console.error("Image load error", err);
            // If we can't load it, we probably can't display it, but let's try returning original
            resolve(file);
        };

        img.src = objectUrl;
    });
}
