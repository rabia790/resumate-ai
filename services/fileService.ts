import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// PDF.js v5+ worker configuration
// We explicitly point to the module worker on a reliable CDN matching the version.
// The importmap uses @^5.4.394, so we target that.
// Note: We use .mjs for the worker as it is an ES module worker.
const pdfjsVersion = pdfjsLib.version || '5.4.394';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsVersion}/build/pdf.worker.min.mjs`;

export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileName = file.name.toLowerCase();
  
  try {
    if (fileName.endsWith('.pdf')) {
      return await extractTextFromPDF(file);
    } else if (fileName.endsWith('.docx')) {
      return await extractTextFromDOCX(file);
    } else if (fileName.endsWith('.txt')) {
      return await extractTextFromTXT(file);
    } else {
      // Fallback strategies
      if (file.type === 'application/pdf') {
        return await extractTextFromPDF(file);
      }
      throw new Error(`Unsupported file type: ${file.name}. Please upload PDF, DOCX, or TXT.`);
    }
  } catch (error) {
    console.error("File extraction error:", error);
    throw error;
  }
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // PDF.js v5 Change: getDocument returns a promise-like object directly, 
  // or we wait on the task itself. The .promise property is deprecated/removed in newer versions.
  // We handle both v4 and v5 styles for safety.
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = loadingTask.promise ? await loadingTask.promise : await loadingTask;
  
  let text = '';
  // Loop through all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    text += strings.join(' ') + '\n';
  }
  return text;
};

const extractTextFromDOCX = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const extractTextFromTXT = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};