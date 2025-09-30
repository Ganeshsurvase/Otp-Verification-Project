import { LightningElement, track } from 'lwc';
import createPayment from '@salesforce/apex/PaymentService.createPayment';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PaymentForm extends LightningElement {
    @track bookingId;
    @track amount;
    @track status = 'Pending';
    @track txnId;

    // Dropdown values
    get statusOptions() {
        return [
            { label: 'Pending', value: 'Pending' },
            { label: 'Completed', value: 'Completed' },
            { label: 'Failed', value: 'Failed' }
        ];
    }

    // Handle form field changes
    handleChange(event) {
        const field = event.target.dataset.field;
        this[field] = event.target.value;
    }

    // Save payment record
    async savePayment() {
        try {
            const result = await createPayment({
                bookingId: this.bookingId,
                amount: parseFloat(this.amount),
                status: this.status,
                txnId: this.txnId
            });

            // Success toast
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Payment created successfully! Id: ' + result,
                    variant: 'success'
                })
            );

            // Clear form
            this.bookingId = '';
            this.amount = '';
            this.status = 'Pending';
            this.txnId = '';

        } catch (error) {
            console.error(error);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: error.body ? error.body.message : 'Error creating payment',
                    variant: 'error'
                })
            );
        }
    }
}
