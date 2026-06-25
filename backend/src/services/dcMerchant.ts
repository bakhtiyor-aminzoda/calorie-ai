import axios from 'axios';
import xml2js from 'xml2js';

const DC_API_URL = 'http://109.74.70.55:98/onecapi';

// Hardcoded for now as requested, but ideally should be env vars
// In a real production app, these MUST be in .env
const DC_ACCOUNT = '20202972301000103797';
const DC_API_KEY = '37d347e2dddad63401e5c95d95789cff';

interface DCTransaction {
    name: string;      // "ЧДММ 'Темур Ойл'"
    docnum: string;    // "1"
    date: string;      // "06.04.21"
    // vid: string;       // "00"
    payer: string;     // "ЧДММ 'Темур Ойл'"
    // accountpay: string; // "20202972001000103204"
    // bankname: string;  // "Душанбе Сити/350101841"
    // incomeostatok: string; // "16"
    // outostatok: string; // "2"
    debet: string;     // "15" (Incoming?) - Doc says Debet/Credit. Typically incoming is Credit for bank account, but let's check doc example.
    // Example: <debet>15</debet>, <credit>0</credit>. 
    // Context: "Сальдо". Usually: Debet = decrease, Credit = increase for liability/equity. For asset (bank account), Debet is increase.
    // Wait, standard accounting: Bank Asset -> Debit increases.
    // Documentation says: <debet>15</debet> - Дебет.
    // We need to look for INCOMING transfers to our account.
    // Let's assume Debet is incoming based on "Incomeostatok" logic (16 start - ? = 2 end). 16 + 15 - ? or 16 - 15 = 1.
    // Actually, let's look at the comment field closely.
    naznach: string;   // "Конвертация..." - This is where we look for the code
}

// Helper to parse DD.MM.YY to Date
function parseDCDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('.');
    return new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
}

// Helper to format Date to YYMMDD
function formatDCDate(date: Date): string {
    const yy = date.getFullYear().toString().slice(-2);
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    return `${yy}${mm}${dd}`;
}

export async function checkDCPayment(commentCode: string, amount: number): Promise<{ success: boolean; transaction?: DCTransaction }> {
    try {
        // We look back 7 days to find the payment
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 7);

        const params = {
            account: DC_ACCOUNT,
            date_start: formatDCDate(startDate),
            date_end: formatDCDate(endDate),
            sign: DC_API_KEY
        };

        console.log(`[DC] Checking payments for code: ${commentCode} from ${params.date_start} to ${params.date_end}`);

        const response = await axios.get(DC_API_URL, { params });
        const xml = response.data;

        // Parse XML
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(xml);

        // Check for error code 100 or 102
        if (result.result?.code === '100') {
            console.error('[DC] Account not found');
            return { success: false };
        }
        if (result.result?.code === '102') {
            console.error('[DC] Invalid Sign/API Key');
            return { success: false };
        }

        // Logic to extract transactions
        // The structure seems to be <str1>...<strK> inside <result> or maybe just <str1> repeated?
        // XML2JS with explicitArray: false might merge repetitive tags into an array or keep single object.
        // Let's assume result.result has dynamic keys like str1, str2 OR a specific list.
        // Wait, the example XML shows:
        // <result>
        //    <str1> ... </str1>
        // </result>
        // If there are multiple, it might be <str1>, <str2>, etc. OR <str> repeated.
        // The doc example <str1> suggests numbered keys which is terrible API design but possible.
        // OR it's just <str> and the 1 is part of the example text.
        // Let's handle both array of "str" or numbered keys.

        // Actually, looking at the parsed object is the only way to be sure without live test. 
        // I will iterate over all keys in result.result that look like "str..."

        let transactions: any[] = [];
        const rawResult = result.result;

        if (rawResult) {
            Object.keys(rawResult).forEach(key => {
                if (key.startsWith('str')) {
                    const item = rawResult[key];
                    // If multiple items have same key (array), item is array. 
                    // But if unique keys (str1, str2), item is object.
                    if (Array.isArray(item)) {
                        transactions.push(...item);
                    } else {
                        transactions.push(item);
                    }
                }
            });
        }

        console.log(`[DC] Found ${transactions.length} transactions`);
        console.log('[DC] Parsing transactions for match...');

        // Find match
        const match = transactions.find(t => {
            const description = t.naznach || '';
            const isCodeMatch = description.includes(commentCode);

            // Check amount if possible. 
            // "debet" and "credit". 
            // We need to know which one is "income".
            // Let's assume if we are looking for payment TO us, it might be in Kredit or Debet depending on bank.
            // Safe bet: check both for the amount.
            const val = parseFloat(amount.toString());
            const debet = parseFloat(t.debet || '0');
            const credit_val = parseFloat(t.credit || '0');

            // Allow small float diff?
            const isAmountMatch = Math.abs(debet - val) < 0.1 || Math.abs(credit_val - val) < 0.1;

            return isCodeMatch && isAmountMatch;
        });

        if (match) {
            console.log('[DC] Payment verified!', match);
            return { success: true, transaction: match };
        }

        return { success: false };

    } catch (error) {
        console.error('[DC] Error checking payment:', error);
        return { success: false };
    }
}
