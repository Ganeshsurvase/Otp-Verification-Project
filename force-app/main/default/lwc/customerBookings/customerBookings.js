import { LightningElement, track } from 'lwc';
import getCustomerBookings from '@salesforce/apex/BookingService.getCustomerBookings';

const COLUMNS = [
    { label: 'Room', fieldName: 'Room__r.Room_Number__c' },
    { label: 'Check-in', fieldName: 'CheckIn__c' },
    { label: 'Check-out', fieldName: 'CheckOut__c' },
    { label: 'Status', fieldName: 'Status__c' }
];

export default class CustomerBookings extends LightningElement {
    @track customerId;
    @track bookings;
    columns = COLUMNS;

    handleChange(event) {
        this.customerId = event.target.value;
    }

    async loadBookings() {
        try {
            this.bookings = await getCustomerBookings({ customerId: this.customerId });
        } catch (err) {
            console.error(err);
        }
    }
}
