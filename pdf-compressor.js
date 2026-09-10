let selectedFile = null;
let compressedBlob = null;

const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const fileInfo = document.getElementById("fileInfo");
const compressionLevel = document.getElementById("compressionLevel");
const compressBtn = document.getElementById("compressBtn");
const clearBtn = document.getElementById("clearBtn");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const result = document.getElementById("result");
const downloadBtn = document.getElementById("downloadBtn");

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

uploadArea.addEventListener("click", function () {
    fileInput.click();
});

fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
        handleFile(this.files[0]);
    }
});

uploadArea.addEventListener("dragover", function (e) {
    e.preventDefault();
    uploadArea.classList.add("dragover");
});

uploadArea.addEventListener("dragleave", function () {
    uploadArea.classList.remove("dragover");
});

uploadArea.addEventListener("drop", function (e) {
    e.preventDefault();
    uploadArea.classList.remove("dragover");

    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

function handleFile(file) {
    if (file.type !== "application/pdf") {
        alert("Please select a PDF file.");
        return;
    }

    selectedFile = file;

    fileInfo.textContent =
        file.name + " (" + formatBytes(file.size) + ")";

    compressBtn.disabled = false;
    result.style.display = "none";
    downloadBtn.style.display = "none";
}

compressBtn.addEventListener("click", async function () {

    if (!selectedFile) {
        alert("Please select a PDF first.");
        return;
    }

    compressBtn.disabled = true;
    clearBtn.disabled = true;

    progressContainer.style.display = "block";
    result.style.display = "none";
    downloadBtn.style.display = "none";

    progressBar.style.width = "0%";
    progressText.textContent = "Starting...";

    try {

        const arrayBuffer = await selectedFile.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;

        const { jsPDF } = window.jspdf;

        let quality = 0.7;
        let renderScale = 1.2;

        if (compressionLevel.value === "low") {
            quality = 0.85;
            renderScale = 1.5;
        }

        if (compressionLevel.value === "medium") {
            quality = 0.65;
            renderScale = 1.2;
        }

        if (compressionLevel.value === "high") {
            quality = 0.45;
            renderScale = 0.9;
        }

        let outputPdf = null;

        for (
            let pageNumber = 1;
            pageNumber <= pdf.numPages;
            pageNumber++
        ) {

            progressText.textContent =
                "Compressing page " +
                pageNumber +
                " of " +
                pdf.numPages +
                "...";

            const page = await pdf.getPage(pageNumber);

            const baseViewport = page.getViewport({
                scale: 1
            });

            const viewport = page.getViewport({
                scale: renderScale
            });

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const imageData = canvas.toDataURL(
                "image/jpeg",
                quality
            );

            const pageWidth =
                baseViewport.width * 0.352777778;

            const pageHeight =
                baseViewport.height * 0.352777778;

            const orientation =
                pageWidth > pageHeight
                    ? "landscape"
                    : "portrait";

            if (pageNumber === 1) {

                outputPdf = new jsPDF({
                    orientation: orientation,
                    unit: "mm",
                    format: [pageWidth, pageHeight],
                    compress: true
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

            const percent =
                Math.round(
                    (pageNumber / pdf.numPages) * 100
                );

            progressBar.style.width =
                percent + "%";
        }

        compressedBlob =
            outputPdf.output("blob");

        const originalSize =
            selectedFile.size;

        const newSize =
            compressedBlob.size;

        const reduction =
            ((originalSize - newSize) / originalSize) * 100;

        result.style.display = "block";

        if (reduction > 0) {

            result.innerHTML =
                "<strong>Compression complete!</strong><br>" +
                "Original size: " +
                formatBytes(originalSize) +
                "<br>" +
                "Compressed size: " +
                formatBytes(newSize) +
                "<br>" +
                "Saved: " +
                reduction.toFixed(1) +
                "%";

        } else {

            result.innerHTML =
                "<strong>Compression complete!</strong><br>" +
                "Original size: " +
                formatBytes(originalSize) +
                "<br>" +
                "New size: " +
                formatBytes(newSize) +
                "<br>" +
                "This PDF could not be reduced further.";
        }

        downloadBtn.style.display =
            "inline-block";

        progressBar.style.width = "100%";

        progressText.textContent =
            "Done!";

    } catch (error) {

        console.error(error);

        alert(
            "Sorry, something went wrong while compressing the PDF."
        );

        progressContainer.style.display =
            "none";
    }

    compressBtn.disabled = false;
    clearBtn.disabled = false;
});

downloadBtn.addEventListener("click", function () {

    if (!compressedBlob) {
        return;
    }

    const url =
        URL.createObjectURL(compressedBlob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download =
        "compressed-" + selectedFile.name;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
});

clearBtn.addEventListener("click", function () {

    selectedFile = null;
    compressedBlob = null;

    fileInput.value = "";

    fileInfo.textContent =
        "No file selected";

    compressBtn.disabled = true;

    downloadBtn.style.display =
        "none";

    progressContainer.style.display =
        "none";

    result.style.display =
        "none";

    progressBar.style.width =
        "0%";

    progressText.textContent =
        "";
});

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

    const i =
        Math.floor(
            Math.log(bytes) / Math.log(1024)
        );

    return (
        parseFloat(
            (
                bytes /
                Math.pow(1024, i)
            ).toFixed(2)
        ) +
        " " +
        units[i]
    );
}
