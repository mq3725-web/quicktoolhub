let selectedFile = null;

const pdfFile = document.getElementById("pdfFile");
const uploadArea = document.getElementById("uploadArea");
const fileName = document.getElementById("fileName");
const compressBtn = document.getElementById("compressBtn");
const clearBtn = document.getElementById("clearBtn");
const compressionLevel = document.getElementById("compressionLevel");
const progressBox = document.getElementById("progressBox");
const progress = document.getElementById("progress");
const statusText = document.getElementById("statusText");
const result = document.getElementById("result");
const originalSize = document.getElementById("originalSize");
const compressedSize = document.getElementById("compressedSize");
const downloadBtn = document.getElementById("downloadBtn");

uploadArea.addEventListener("click", () => {
  pdfFile.click();
});

pdfFile.addEventListener("change", function () {
  if (this.files.length > 0) {
    selectedFile = this.files[0];

    if (selectedFile.type !== "application/pdf") {
      alert("Please select a PDF file.");
      selectedFile = null;
      return;
    }

    fileName.textContent = "Selected: " + selectedFile.name;
    compressBtn.disabled = false;
    result.style.display = "none";
  }
});

compressBtn.addEventListener("click", async function () {

  if (!selectedFile) {
    alert("Please select a PDF file first.");
    return;
  }

  progressBox.style.display = "block";
  result.style.display = "none";
  compressBtn.disabled = true;

  progress.style.width = "10%";
  statusText.textContent = "Reading PDF...";

  try {

    const arrayBuffer = await selectedFile.arrayBuffer();

    progress.style.width = "30%";
    statusText.textContent = "Processing PDF...";

    /*
      PDF.js is used to read the PDF.
      The processed pages are rendered and rebuilt into
      a new PDF using jsPDF.
    */

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise;

    const totalPages = pdf.numPages;

    const { jsPDF } = window.jspdf;

    let outputPdf = null;

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {

      const page = await pdf.getPage(pageNumber);

      const scale = getScale();
      const viewport = page.getViewport({ scale: scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const imageQuality = getImageQuality();

      const imageData = canvas.toDataURL(
        "image/jpeg",
        imageQuality
      );

      const orientation =
        viewport.width > viewport.height
          ? "landscape"
          : "portrait";

      const pageWidth = viewport.width * 0.264583;
      const pageHeight = viewport.height * 0.264583;

      if (pageNumber === 1) {

        outputPdf = new jsPDF({
          orientation: orientation,
          unit: "mm",
          format: [pageWidth, pageHeight]
        });

      } else {

        outputPdf.addPage(
          [pageWidth, pageHeight],
          orientation
        );

      }

      outputPdf.addImage(
        imageData,
        "JPEG",
        0,
        0,
        pageWidth,
        pageHeight,
        undefined,
        "FAST"
      );

      const percentage =
        30 + Math.round((pageNumber / totalPages) * 55);

      progress.style.width = percentage + "%";

      statusText.textContent =
        "Compressing page " +
        pageNumber +
        " of " +
        totalPages +
        "...";
    }

    progress.style.width = "90%";
    statusText.textContent = "Creating compressed PDF...";

    const pdfBlob = outputPdf.output("blob");

    progress.style.width = "100%";
    statusText.textContent = "Compression complete!";

    const downloadURL = URL.createObjectURL(pdfBlob);

    const oldURL = downloadBtn.dataset.url;

    if (oldURL) {
      URL.revokeObjectURL(oldURL);
    }

    downloadBtn.dataset.url = downloadURL;

    downloadBtn.href = downloadURL;
    downloadBtn.download =
      selectedFile.name.replace(/\.pdf$/i, "") +
      "-compressed.pdf";

    originalSize.textContent =
      formatBytes(selectedFile.size);

    compressedSize.textContent =
      formatBytes(pdfBlob.size);

    result.style.display = "block";

  } catch (error) {

    console.error(error);

    statusText.textContent =
      "Something went wrong while processing the PDF.";

    alert(
      "The PDF could not be compressed. Please try another PDF file."
    );

  } finally {

    compressBtn.disabled = false;

  }

});

clearBtn.addEventListener("click", function () {

  selectedFile = null;

  pdfFile.value = "";

  fileName.textContent = "";

  compressBtn.disabled = true;

  progressBox.style.display = "none";

  progress.style.width = "0%";

  statusText.textContent = "";

  result.style.display = "none";

  if (downloadBtn.dataset.url) {
    URL.revokeObjectURL(downloadBtn.dataset.url);
    delete downloadBtn.dataset.url;
  }

});

function getScale() {

  const level = compressionLevel.value;

  if (level === "high") {
    return 0.8;
  }

  if (level === "medium") {
    return 1.1;
  }

  return 1.5;
}

function getImageQuality() {

  const level = compressionLevel.value;

  if (level === "high") {
    return 0.45;
  }

  if (level === "medium") {
    return 0.65;
  }

  return 0.85;
}

function formatBytes(bytes) {

  if (bytes === 0) {
    return "0 Bytes";
  }

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB"
  ];

  const index =
    Math.floor(
      Math.log(bytes) / Math.log(1024)
    );

  return (
    parseFloat(
      (bytes / Math.pow(1024, index)).toFixed(2)
    ) +
    " " +
    units[index]
  );
}
