let selectedFiles = [];
let mergedBlob = null;

const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const selectBtn = document.getElementById("selectBtn");
const fileList = document.getElementById("fileList");
const mergeBtn = document.getElementById("mergeBtn");
const clearBtn = document.getElementById("clearBtn");
const progressContainer = document.getElementById("progressContainer");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const result = document.getElementById("result");
const downloadBtn = document.getElementById("downloadBtn");

selectBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    fileInput.click();
});

uploadArea.addEventListener("click", function () {
    fileInput.click();
});

fileInput.addEventListener("change", function () {
    addFiles(Array.from(this.files));
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

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
});

function addFiles(files) {
    const pdfFiles = files.filter(
        file => file.type === "application/pdf"
    );

    if (pdfFiles.length === 0) {
        alert("Please select PDF files only.");
        return;
    }

    selectedFiles = selectedFiles.concat(pdfFiles);

    renderFileList();

    mergeBtn.disabled = selectedFiles.length < 2;
}

function renderFileList() {
    fileList.innerHTML = "";

    selectedFiles.forEach((file, index) => {

        const item = document.createElement("div");
        item.className = "file-item";

        const info = document.createElement("div");

        const name = document.createElement("div");
        name.className = "file-name";
        name.textContent = (index + 1) + ". " + file.name;

        const size = document.createElement("span");
        size.className = "file-size";
        size.textContent = formatBytes(file.size);

        info.appendChild(name);
        info.appendChild(size);

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-file";
        removeBtn.textContent = "Remove";

        removeBtn.addEventListener("click", function () {
            selectedFiles.splice(index, 1);
            renderFileList();
            mergeBtn.disabled = selectedFiles.length < 2;
        });

        item.appendChild(info);
        item.appendChild(removeBtn);

        fileList.appendChild(item);
    });
}

mergeBtn.addEventListener("click", async function () {

    if (selectedFiles.length < 2) {
        alert("Please select at least two PDF files.");
        return;
    }

    mergeBtn.disabled = true;
    clearBtn.disabled = true;

    progressContainer.style.display = "block";
    result.style.display = "none";
    downloadBtn.style.display = "none";

    progressBar.style.width = "0%";
    progressText.textContent = "Starting...";

    try {

        const { PDFDocument } = PDFLib;

        const mergedPdf = await PDFDocument.create();

        for (let i = 0; i < selectedFiles.length; i++) {

            progressText.textContent =
                "Merging file " +
                (i + 1) +
                " of " +
                selectedFiles.length +
                "...";

            const fileBytes =
                await selectedFiles[i].arrayBuffer();

            const pdf =
                await PDFDocument.load(fileBytes);

            const pages =
                await mergedPdf.copyPages(
                    pdf,
                    pdf.getPageIndices()
                );

            pages.forEach(page => {
                mergedPdf.addPage(page);
            });

            const percent =
                Math.round(
                    ((i + 1) / selectedFiles.length) * 100
                );

            progressBar.style.width = percent + "%";
        }

        const mergedBytes =
            await mergedPdf.save();

        mergedBlob =
            new Blob(
                [mergedBytes],
                { type: "application/pdf" }
            );

        result.innerHTML =
            "<strong>PDFs merged successfully!</strong><br>" +
            selectedFiles.length +
            " PDF files were combined into one PDF.<br>" +
            "Merged size: " +
            formatBytes(mergedBlob.size);

        result.style.display = "block";

        downloadBtn.style.display = "inline-block";

        progressBar.style.width = "100%";
        progressText.textContent = "Done!";

    } catch (error) {

        console.error(error);

        alert(
            "Sorry, something went wrong while merging the PDFs."
        );

        progressContainer.style.display = "none";
    }

    mergeBtn.disabled = selectedFiles.length < 2;
    clearBtn.disabled = false;
});

downloadBtn.addEventListener("click", function () {

    if (!mergedBlob) {
        return;
    }

    const url =
        URL.createObjectURL(mergedBlob);

    const a =
        document.createElement("a");

    a.href = url;
    a.download = "merged-pdf.pdf";

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    URL.revokeObjectURL(url);
});

clearBtn.addEventListener("click", function () {

    selectedFiles = [];
    mergedBlob = null;

    fileInput.value = "";

    fileList.innerHTML = "";

    mergeBtn.disabled = true;

    progressContainer.style.display = "none";

    result.style.display = "none";

    downloadBtn.style.display = "none";

    progressBar.style.width = "0%";

    progressText.textContent = "";
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
