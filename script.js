// ============================================
// PDF.JS
// ============================================

import * as pdfjsLib from
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


// ============================================
// SUPABASE
// ============================================

const SUPABASE_URL =
    "YOUR_SUPABASE_URL";

const SUPABASE_ANON_KEY =
    "YOUR_SUPABASE_ANON_KEY";

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ============================================
// ELEMENTS
// ============================================

const fileInput =
    document.getElementById("fileInput");

const pagesInput =
    document.getElementById("pages");

const copiesInput =
    document.getElementById("copies");

const sideInput =
    document.getElementById("side");

const pagesPerSheetInput =
    document.getElementById("pagesPerSheet");

const paperInput =
    document.getElementById("paper");

const colourInput =
    document.getElementById("colour");

const totalElement =
    document.getElementById("total");

const calculationElement =
    document.getElementById("calculation");

const submitBtn =
    document.getElementById("submitBtn");

const message =
    document.getElementById("message");


// ============================================
// PRICE SETTINGS
// ============================================

let settings = {

    bw_single: 2,

    bw_both: 3,

    colour_single: 10,

    colour_both: 15,

    a3_extra: 2

};


// ============================================
// LOAD SETTINGS
// ============================================

async function loadSettings() {

    const { data, error } =
        await supabaseClient
        .from("print_settings")
        .select("*")
        .eq("active", true)
        .limit(1)
        .single();


    if (!error && data) {

        settings = data;

    }


    calculatePrice();

}


// ============================================
// AUTO PDF PAGE COUNT
// ============================================

async function getPDFPageCount(file) {

    const arrayBuffer =
        await file.arrayBuffer();

    const pdf =
        await pdfjsLib.getDocument({
            data: arrayBuffer
        }).promise;

    return pdf.numPages;

}


// ============================================
// FILE UPLOAD EVENT
// ============================================

fileInput.addEventListener(
    "change",
    async () => {

        const file =
            fileInput.files[0];

        if (!file) return;


        document.getElementById(
            "fileName"
        ).textContent =
            "Selected: " + file.name;


        // ------------------------------------
        // PDF
        // ------------------------------------

        if (
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf")
        ) {

            try {

                pagesInput.disabled = true;

                pagesInput.value = "";

                pagesInput.placeholder =
                    "Calculating pages...";


                const pageCount =
                    await getPDFPageCount(file);


                pagesInput.value =
                    pageCount;


                pagesInput.placeholder =
                    "";


                pagesInput.disabled = false;


                calculatePrice();


                showMessage(
                    `PDF detected: ${pageCount} pages`,
                    "success"
                );


            }
            catch (error) {

                console.error(error);

                pagesInput.disabled = false;

                pagesInput.value = 1;

                showMessage(
                    "PDF page count could not be read.",
                    "error"
                );

            }

        }

        // ------------------------------------
        // IMAGE
        // ------------------------------------

        else if (
            file.type.startsWith("image/")
        ) {

            pagesInput.value = 1;

            pagesInput.disabled = true;

            calculatePrice();


            showMessage(
                "Image detected: 1 page",
                "success"
            );

        }

        // ------------------------------------
        // OTHER FILE
        // ------------------------------------

        else {

            pagesInput.disabled = false;

            pagesInput.value = 1;

            calculatePrice();

        }

    }
);


// ============================================
// PRICE CALCULATION
// ============================================

function calculatePrice() {

    const pages =
        Math.max(
            1,
            parseInt(pagesInput.value) || 1
        );


    const copies =
        Math.max(
            1,
            parseInt(copiesInput.value) || 1
        );


    const side =
        sideInput.value;


    const colour =
        colourInput.value;


    const paper =
        paperInput.value;


    const pagesPerSheet =
        Number(
            pagesPerSheetInput.value
        );


    let rate;


    // ------------------------------------
    // RATE
    // ------------------------------------

    if (colour === "colour") {

        rate =
            side === "both"
            ? Number(settings.colour_both)
            : Number(settings.colour_single);

    }

    else {

        rate =
            side === "both"
            ? Number(settings.bw_both)
            : Number(settings.bw_single);

    }


    // A3 EXTRA

    if (paper === "A3") {

        rate +=
            Number(settings.a3_extra);

    }


    // ------------------------------------
    // SHEETS
    // ------------------------------------

    const sheets =
        Math.ceil(
            pages / pagesPerSheet
        );


    const total =
        sheets *
        copies *
        rate;


    totalElement.textContent =
        total.toFixed(2);


    calculationElement.textContent =
        `${pages} pages × ${copies} copy = ${sheets} sheets`;

}


// ============================================
// SETTINGS CHANGE
// ============================================

[
    pagesInput,
    copiesInput,
    sideInput,
    pagesPerSheetInput,
    paperInput,
    colourInput

].forEach(element => {

    element.addEventListener(
        "input",
        calculatePrice
    );

    element.addEventListener(
        "change",
        calculatePrice
    );

});


// ============================================
// MESSAGE
// ============================================

function showMessage(
    text,
    type
) {

    message.textContent =
        text;

    message.className =
        "message " + type;

}


// ============================================
// UPLOAD FILE TO SUPABASE
// ============================================

async function uploadFile(file) {

    const extension =
        file.name
        .split(".")
        .pop()
        .toLowerCase();


    const uniqueName =
        crypto.randomUUID()
        + "."
        + extension;


    const filePath =
        "orders/"
        + uniqueName;


    const { error } =
        await supabaseClient
        .storage
        .from("print-files")
        .upload(
            filePath,
            file
        );


    if (error) {

        throw error;

    }


    return filePath;

}


// ============================================
// SUBMIT ORDER
// ============================================

submitBtn.addEventListener(
    "click",
    async () => {

        try {

            submitBtn.disabled =
                true;


            showMessage(
                "Please wait...",
                "success"
            );


            // FILE

            if (
                !fileInput.files.length
            ) {

                throw new Error(
                    "Please select a file."
                );

            }


            const file =
                fileInput.files[0];


            // CUSTOMER

            const customerName =
                document.getElementById(
                    "customerName"
                ).value.trim();


            const customerMobile =
                document.getElementById(
                    "customerMobile"
                ).value.trim();


            if (!customerName) {

                throw new Error(
                    "Please enter your name."
                );

            }


            if (
                !/^[0-9]{10}$/.test(
                    customerMobile
                )
            ) {

                throw new Error(
                    "Please enter valid mobile number."
                );

            }


            // PRINT SETTINGS

            const pages =
                parseInt(
                    pagesInput.value
                ) || 1;


            const copies =
                parseInt(
                    copiesInput.value
                ) || 1;


            const side =
                sideInput.value;


            const pagesPerSheet =
                parseInt(
                    pagesPerSheetInput.value
                );


            const paper =
                paperInput.value;


            const colour =
                colourInput.value;


            const paymentMode =
                document.querySelector(
                    'input[name="payment"]:checked'
                ).value;


            // RATE

            let rate;


            if (
                colour === "colour"
            ) {

                rate =
                    side === "both"
                    ? Number(settings.colour_both)
                    : Number(settings.colour_single);

            }

            else {

                rate =
                    side === "both"
                    ? Number(settings.bw_both)
                    : Number(settings.bw_single);

            }


            if (paper === "A3") {

                rate +=
                    Number(settings.a3_extra);

            }


            const sheets =
                Math.ceil(
                    pages /
                    pagesPerSheet
                );


            const totalAmount =
                sheets *
                copies *
                rate;


            // UPLOAD

            showMessage(
                "Uploading file...",
                "success"
            );


            const filePath =
                await uploadFile(file);


            // SAVE ORDER

            const { data, error } =
                await supabaseClient
                .from("print_orders")
                .insert({

                    customer_name:
                        customerName,

                    customer_mobile:
                        customerMobile,

                    file_name:
                        file.name,

                    file_url:
                        filePath,

                    file_type:
                        file.type,

                    total_pages:
                        pages,

                    copies:
                        copies,

                    print_side:
                        side,

                    pages_per_sheet:
                        pagesPerSheet,

                    paper_size:
                        paper,

                    colour_mode:
                        colour,

                    price_per_page:
                        rate,

                    total_amount:
                        totalAmount,

                    payment_mode:
                        paymentMode,

                    payment_status:
                        "pending",

                    order_status:
                        paymentMode === "cash"
                        ? "payment_pending"
                        : "payment_pending"

                })
                .select()
                .single();


            if (error) {

                throw error;

            }


            showMessage(
                `Order submitted! Order No: ${data.order_no}`,
                "success"
            );


            submitBtn.disabled =
                false;

        }

        catch (error) {

            console.error(error);


            showMessage(
                error.message ||
                "Something went wrong.",
                "error"
            );


            submitBtn.disabled =
                false;

        }

    }
);


// ============================================
// START
// ============================================

loadSettings();
