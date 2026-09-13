// ============================================
// SUPABASE CONFIGURATION
// ============================================

const SUPABASE_URL =
    "https://mtjrovximdwpjnkldeof.supabase.co/rest/v1/";

const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anJvdnhpbWR3cGpua2xkZW9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzMDY3ODYsImV4cCI6MjEwNDg4Mjc4Nn0.t8oVWaKmKZHwZWYxuDHmNbbrzL7ZodbvuHlteTnd6qk";


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
// DEFAULT PRICE
// ============================================

let settings = {
    bw_single: 2,
    bw_both: 3,
    colour_single: 10,
    colour_both: 15,
    a3_extra: 2
};


// ============================================
// LOAD PRICE SETTINGS
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
// CALCULATE PRICE
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

    let rate;


    if (colour === "colour") {

        rate =
            side === "both"
                ? Number(settings.colour_both)
                : Number(settings.colour_single);

    } else {

        rate =
            side === "both"
                ? Number(settings.bw_both)
                : Number(settings.bw_single);
    }


    if (paper === "A3") {

        rate += Number(settings.a3_extra);

    }


    /*
       Pages per sheet changes the number
       of physical sheets.

       Example:
       8 pages / 2 pages per sheet
       = 4 sheets
    */

    const sheets =
        Math.ceil(
            pages /
            Number(pagesPerSheetInput.value)
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
// EVENTS
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
        "change",
        calculatePrice
    );

    element.addEventListener(
        "input",
        calculatePrice
    );

});


fileInput.addEventListener(
    "change",
    () => {

        if (fileInput.files.length > 0) {

            document.getElementById(
                "fileName"
            ).textContent =
                "Selected: " +
                fileInput.files[0].name;

        }

    }
);


// ============================================
// SHOW MESSAGE
// ============================================

function showMessage(
    text,
    type
) {

    message.textContent = text;

    message.className =
        "message " + type;

}


// ============================================
// UPLOAD FILE
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
// CREATE ORDER
// ============================================

submitBtn.addEventListener(
    "click",
    async () => {

        try {

            submitBtn.disabled = true;

            showMessage(
                "Please wait...",
                "success"
            );


            // FILE CHECK

            if (!fileInput.files.length) {

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


            if (!/^[0-9]{10}$/.test(
                customerMobile
            )) {

                throw new Error(
                    "Please enter valid mobile number."
                );

            }


            // PRINT DATA

            const pages =
                parseInt(
                    pagesInput.value
                );


            const copies =
                parseInt(
                    copiesInput.value
                );


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


            // PRICE

            let rate;


            if (colour === "colour") {

                rate =
                    side === "both"
                        ? Number(settings.colour_both)
                        : Number(settings.colour_single);

            } else {

                rate =
                    side === "both"
                        ? Number(settings.bw_both)
                        : Number(settings.bw_single);
            }


            if (paper === "A3") {

                rate += Number(settings.a3_extra);

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


            // ORDER STATUS

            const paymentStatus =
                paymentMode === "cash"
                    ? "pending"
                    : "pending";


            const orderStatus =
                paymentMode === "cash"
                    ? "payment_pending"
                    : "payment_pending";


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
                            paymentStatus,

                        order_status:
                            orderStatus

                    })
                    .select()
                    .single();


            if (error) {

                throw error;

            }


            // SUCCESS

            showMessage(
                `Order submitted successfully! Order No: ${data.order_no}`,
                "success"
            );


            submitBtn.disabled = false;

        }

        catch (error) {

            console.error(error);

            showMessage(
                error.message ||
                "Something went wrong.",
                "error"
            );


            submitBtn.disabled = false;

        }

    }
);


// ============================================
// START
// ============================================

loadSettings();
