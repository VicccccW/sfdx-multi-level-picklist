import { LightningElement, api, wire, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import AREAS_OF_INTEREST_RAW_JSON_FIELD from '@salesforce/schema/Account.Areas_of_Interest_Raw_JSON__c';

export default class AreaOfInterestMultiLevelPicklistDisplay extends LightningElement {
  @api recordId;
  @track items;

  error;

  @wire(getRecord, { recordId: '$recordId', fields: [AREAS_OF_INTEREST_RAW_JSON_FIELD] })
  wiredAccount({ error, data }) {
    if (data) {
      this.items = this.formatSelected(data.fields.Areas_of_Interest_Raw_JSON__c.value);;
      this.error = undefined;
    } else if (error) {
      this.error = error;
      this.items = undefined;
    }
  };

  formatSelected(rawJson) {
    if (!rawJson) {
      // if null or empty str, init an empty array
      return [];
    } else {
      return JSON.parse(rawJson);
    }
  }
}