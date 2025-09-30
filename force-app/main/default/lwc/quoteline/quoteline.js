import { LightningElement, track } from 'lwc';
import saveQuoteHierarchy from '@salesforce/apex/QuoteCSVImporterController.saveQuoteHierarchy';

export default class Quoteline extends LightningElement {
    @track step = 1;
    @track headers = [];
    @track csvRecords = [];
    @track previewRowsDisplay = [];
    @track mappingOptions = [
        { label: 'Opportunity Name', name: 'opportunityname', value: '' },
        { label: 'Quote Name', name: 'quotename', value: '' },
        { label: 'Quote Line Name', name: 'quotelineitemname', value: '' },
        { label: 'Product Code', name: 'productid', value: '' },
        { label: 'Quantity', name: 'quantity', value: '' },
        { label: 'Unit Price', name: 'unitprice', value: '' }
    ];

    @track progress = 0;
    @track totalRecords = 0;
    @track processed = 0;
    @track saveResult = null;
    fileName;
    disableNext = true;

    get currentStep() {
        return String(this.step);
    }

    get isStep1() { return this.step === 1; }
    get isStep2() { return this.step === 2; }
    get isStep3() { return this.step === 3; }
    get isStep4() { return this.step === 4; }
    get isStep5() { return this.step === 5; }

    get csvHeaderOptions() {
        return this.headers.map(h => ({ label: h, value: h }));
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.fileName = file.name;
        this.disableNext = true;

        const reader = new FileReader();
        reader.onload = () => {
            const rows = this.parseCSV(reader.result);
            if (!rows || rows.length < 2) return;

            this.headers = rows[0].map(h => h.trim());
            this.csvRecords = rows.slice(1).map(r => {
                const obj = {};
                for (let i = 0; i < this.headers.length; i++) {
                    obj[this.headers[i]] = r[i] || '';
                }
                return obj;
            });

            // 🔥 Auto-map: match CSV headers with expected fields
            this.autoMapFields();

            this.previewRowsDisplay = this.buildPreviewRowsDisplay(this.csvRecords.slice(0, 10), this.headers);
            this.disableNext = false;
        };
        reader.readAsText(file, 'UTF-8');
    }

    parseCSV(text) {
        const rows = [];
        let cur = '', row = [], inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i], nxt = i < text.length-1 ? text[i+1]: null;
            if (ch === '"') {
                if (inQuotes && nxt === '"') { cur+='"'; i++; } 
                else { inQuotes = !inQuotes; }
            } else if ((ch === ',' && !inQuotes)) { row.push(cur); cur=''; }
            else if ((ch === '\n'||ch==='\r') && !inQuotes) {
                if (ch==='\r' && nxt==='\n') continue;
                row.push(cur); rows.push(row); row=[]; cur='';
            } else cur+=ch;
        }
        if (cur || row.length) row.push(cur), rows.push(row);
        return rows.map(r=>r.map(c=>(c==null?'':c.trim())));
    }

    buildPreviewRowsDisplay(rows, headers) {
        return rows.map((r, ridx) => ({
            id: `row-${ridx}`,
            cols: headers.map((h, cidx) => ({ k: `cell-${ridx}-${cidx}`, header: h, value: r[h] ?? '' }))
        }));
    }

    // 🔥 Auto mapping function
    autoMapFields() {
        const headerMap = this.headers.reduce((map, h) => {
            map[h.replace(/\s+/g, '').toLowerCase()] = h;
            return map;
        }, {});

        this.mappingOptions = this.mappingOptions.map(field => {
            const key = field.name.toLowerCase();
            const matchedHeader = headerMap[key];
            return { ...field, value: matchedHeader || '' };
        });
    }

    goToPreview() { this.step = 2; }
    goBack() { this.step = 1; }
    goToMapping() { this.step = 3; }
    goBackToPreview() { this.step = 2; }

    handleMappingChange(event) {
        const name = event.target.dataset.id;
        const value = event.detail.value;
        const mapObj = this.mappingOptions.find(f => f.name === name);
        if (mapObj) mapObj.value = value;
    }

    async processRecords() {
        this.step = 4;
        this.totalRecords = this.csvRecords.length;
        this.processed = 0;
        this.progress = 0;

        const recordsToSave = this.csvRecords.map(row => {
            const mapped = {};
            this.mappingOptions.forEach(f => { mapped[f.name] = row[f.value] ?? ''; });
            return mapped;
        });

        try {
            const batchSize = 10;
            let insertedOpp = 0, insertedQuote = 0, insertedQli = 0;
            const errors = [];

            for (let i=0; i<recordsToSave.length; i+=batchSize) {
                const batch = recordsToSave.slice(i,i+batchSize);
                const res = await saveQuoteHierarchy({ recordsJson: JSON.stringify(batch) });
                insertedOpp += res.opportunitiesInserted;
                insertedQuote += res.quotesInserted;
                insertedQli += res.quoteLinesInserted;
                if (!res.success) errors.push(...res.errors);

                this.processed += batch.length;
                this.progress = Math.round((this.processed/this.totalRecords)*100);

                await new Promise(r=>setTimeout(r,200));
            }

            this.saveResult = {
                success: errors.length===0,
                insertedOpportunities: insertedOpp,
                insertedQuotes: insertedQuote,
                insertedQuoteLines: insertedQli,
                errors
            };
            this.step = 5;
        } catch(err) {
            this.saveResult = { success:false, errors:[String(err)] };
            this.step = 5;
        }
    }

    get errorMessagesWithKey() {
        return (this.saveResult?.errors||[]).map((msg,i)=>({id:`err-${i}`,text:msg}));
    }
}
