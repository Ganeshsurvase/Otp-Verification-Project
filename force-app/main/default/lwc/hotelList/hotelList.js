import { LightningElement, wire } from 'lwc';
import getAllHotels from '@salesforce/apex/HotelService.getAllHotels';

const COLUMNS = [
    { label: 'Hotel Name', fieldName: 'Name' },
    { label: 'Location', fieldName: 'Location__c' },
    { label: 'Rating', fieldName: 'Rating__c' }
];

export default class HotelList extends LightningElement {
    hotels;
    columns = COLUMNS;

    @wire(getAllHotels)
    wiredHotels({data, error}) {
        if (data) this.hotels = data;
        if (error) console.error(error);
    }
}
