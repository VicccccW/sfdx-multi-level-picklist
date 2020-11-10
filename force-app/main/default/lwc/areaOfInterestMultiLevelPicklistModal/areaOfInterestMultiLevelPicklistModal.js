import { LightningElement, api } from 'lwc';

export default class AreaOfInterestMultiLevelPicklistModal extends LightningElement {
  @api recordId;

  showModal = false;
  hasEdited = false;

  renderedCallback() {
    this.hasEdited = false;
  }

  openModal() {
    // to open modal window set 'showModal' tarck value as true
    this.showModal = true;
  }

  closeModal() {
    // to close modal window set 'showModal' tarck value as false
    this.showModal = false;
  }

  editHandler() {
    if (!this.hasEdited) {
      this.hasEdited = true;
      this.template.querySelectorAll('button').forEach(element => {
        if (element.name !== "Close") {
          element.removeAttribute("disabled");
        }
      });
    }
  }

  revertHandler() {
    this.disableButton();
    this.template.querySelector('c-area-of-interest-multi-level-picklist-page').revertHandler();
  }

  saveHandler() {
    this.disableButton();
    this.template.querySelector('c-area-of-interest-multi-level-picklist-page').saveHandler();
  }

  disableButton() {
    this.hasEdited = false;
    this.template.querySelectorAll('button').forEach(element => {
      if (element.name !== "Close") {
        element.setAttribute("disabled", null);
      }
    });
  }
}