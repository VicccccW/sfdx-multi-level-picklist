import { LightningElement, api } from 'lwc';

export default class AreaOfInterestMultiLevelPicklist extends LightningElement {
  @api items;
  @api cmpName;

  clickHandler(event) {
    if (this.isAddToSelected()) {
      this.addToSelectedHandler(event.detail.name);
    } else if (this.isRemoveFromSelected) {
      this.removeFromSelectedHandler(event.detail.name);
    }
  }

  isAddToSelected() {
    return this.cmpName === 'picklist';
  }

  isRemoveFromSelected() {
    return this.cmpName === 'selected';
  }

  addToSelectedHandler(name) {
    this.dispatchEvent(new CustomEvent("addselected", {
      detail: name,
      bubbles: true,
      composed: true
    }));
  }

  removeFromSelectedHandler(name) {
    this.dispatchEvent(new CustomEvent("removeselected", {
      detail: name,
      bubbles: true,
      composed: true
    }));
  }
}