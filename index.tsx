import { GoogleGenAI, Modality } from "https://aistudiocdn.com/@google/genai@^1.27.0";

const fileUpload = document.getElementById('file-upload') as HTMLInputElement;
const originalImage = document.getElementById('original-image') as HTMLImageElement;
const originalImageContainer = document.getElementById('original-image-container');
const editedImage = document.getElementById('edited-image') as HTMLImageElement;
const editedImageContainer = document.getElementById('edited-image-container');
const promptInput = document.getElementById('prompt-input') as HTMLInputElement;
const generateButton = document.getElementById('generate-button') as HTMLButtonElement;
const saveButton = document.getElementById('save-button') as HTMLButtonElement;
const loader = document.getElementById('loader');
const buttonText = document.getElementById('button-text');
const buttonSpinner = document.getElementById('button-spinner');

let uploadedImage: { data: string, mimeType: string } | null = null;

const checkFormState = () => {
    generateButton.disabled = !uploadedImage || !promptInput.value.trim();
};

fileUpload.addEventListener('change', (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            originalImage.src = result;
            originalImage.classList.remove('hidden');
            originalImageContainer.querySelector('.placeholder')?.classList.add('hidden');

            const [header, base64Data] = result.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1];
            if (base64Data && mimeType) {
                uploadedImage = { data: base64Data, mimeType };
            } else {
                uploadedImage = null;
            }
            checkFormState();
        };
        reader.readAsDataURL(file);
    }
});

promptInput.addEventListener('input', checkFormState);

generateButton.addEventListener('click', async () => {
    if (!uploadedImage || !promptInput.value.trim()) {
        alert("Please upload an image and provide a prompt.");
        return;
    }

    // Set loading state
    saveButton.classList.add('hidden');
    generateButton.disabled = true;
    loader.classList.remove('hidden');
    buttonText.textContent = "Generating...";
    buttonSpinner.classList.remove('hidden');
    editedImage.classList.add('hidden');
    editedImageContainer.querySelector('.placeholder')?.classList.remove('hidden');


    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: uploadedImage.data,
                            mimeType: uploadedImage.mimeType,
                        },
                    },
                    {
                        text: promptInput.value,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const mimeType = part.inlineData.mimeType || 'image/png';
                const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
                editedImage.src = imageUrl;
                editedImage.classList.remove('hidden');
                editedImageContainer.querySelector('.placeholder')?.classList.add('hidden');
                saveButton.classList.remove('hidden');
                break; // Assume only one image part is returned
            }
        }

    } catch (error) {
        console.error(error);
        alert("An error occurred while generating the image. Please check the console for details.");
    } finally {
        // Reset loading state
        generateButton.disabled = false;
        loader.classList.add('hidden');
        buttonText.textContent = "Generate";
        buttonSpinner.classList.add('hidden');
        checkFormState();
    }
});

saveButton.addEventListener('click', () => {
    if (!editedImage.src || editedImage.classList.contains('hidden')) {
        return;
    }
    const link = document.createElement('a');
    link.href = editedImage.src;
    
    const mimeType = editedImage.src.match(/data:(image\/\w+);/)?.[1];
    const extension = mimeType ? mimeType.split('/')[1] : 'png';

    link.download = `edited-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});