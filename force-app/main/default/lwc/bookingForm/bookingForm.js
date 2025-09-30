import { LightningElement, track } from 'lwc';
import createBooking from '@salesforce/apex/BookingService.createBooking';

export default class BookingForm extends LightningElement {
    @track roomId;
    @track customerId;
    @track checkIn;
    @track checkOut;

    handleChange(event) {
        this[event.target.label.replace(/\s/g, '').toLowerCase()] = event.target.value;
    }

    async createBooking() {
        try {
            const id = await createBooking({
                roomId: this.roomId,
                customerId: this.customerId,
                checkIn: this.checkIn,
                checkOut: this.checkOut
            });
            alert('Booking created: ' + id);
        } catch (err) {
            console.error(err);
        }
    }
}
