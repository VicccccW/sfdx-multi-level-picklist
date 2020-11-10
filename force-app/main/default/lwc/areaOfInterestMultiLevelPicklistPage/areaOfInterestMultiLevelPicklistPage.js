import { LightningElement, api, wire } from 'lwc';
import getLevelOneAndRelatedLevelTwoValues from '@salesforce/apex/AreasOfInterestController.getLevelOneAndRelatedLevelTwoValues';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ADD, REMOVE, LEVEL_ONE, LEVEL_TWO, LOCAL_DEV_AOI_METADATA, LOCAL_DEV_SELECTED1, LOCAL_DEV_SELECTED2 } from './utils';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { reduceErrors } from 'c/ldsUtils';
import AREAS_OF_INTEREST_RAW_JSON_FIELD from '@salesforce/schema/Account.Areas_of_Interest_Raw_JSON__c';

const sortArrayByLabel = (a, b) => a.label < b.label ? -1 : a.label > b.label ? 1 : 0;

export default class AreaOfInterestMultiLevelPicklistPage extends NavigationMixin(LightningElement) {
  @api recordId;

  _picklist;
  _selected;
  _loaded = false;

  isLoading = false;
  error;

  connectedCallback() {
    this.isLoading = true;
  }

  @wire(getRecord, { recordId: '$recordId', fields: [AREAS_OF_INTEREST_RAW_JSON_FIELD] })
  wiredAccount({ error, data }) {
    this.isLoading = true;

    if (data) {
      if (!this._loaded) {
        getLevelOneAndRelatedLevelTwoValues()
          .then(value => {
            this._levelOneTable = this.setLevelOneTable(value);
            this._levelTwoTable = this.setLevelTwoTable(value);
            this._initSelected = this.formatJson(data.fields.Areas_of_Interest_Raw_JSON__c.value);
            this._selected = this._initSelected;
            this._initPicklist = this.calculateInitPicklist(value, this._initSelected);
            this._picklist = this._initPicklist;
            this.error = undefined;
            this._loaded = true;
            this.isLoading = false;
          })
          .catch(error => {
            this.error = reduceErrors(error).join(', ');
            this.isLoading = false;
          })
      }
    } else if (error) {
      this.error = error;
      this.isLoading = false;
    }
  };

  get picklist() {
    return this._picklist;
  }

  set picklist(value) {
    this._picklist = this.buildNewList(this._picklist, value);
  }

  get selected() {
    return this._selected;
  }

  set selected(value) {
    this._selected = this.buildNewList(this._selected, value);
  }

  @api
  revertHandler(event) {
    this._selected = this._initSelected;
    this._picklist = this._initPicklist;
  }

  @api
  saveHandler(event) {
    this.isLoading = true;

    const fields = {
      "Id": this.recordId,
      "Areas_of_Interest_Raw_JSON__c": JSON.stringify(this._selected)
    };

    updateRecord({ fields })
      .then(() => {
        this.error = undefined;
        this.isLoading = false;
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Success',
            message: 'Areas of Interest are updated.',
            variant: 'success'
          })
        );
      })
      .then(() => {
        //refresh page
        this.navigateToRecordPage(this.recordId);
      })
      .catch(error => {
        this.error = reduceErrors(error).join(', ');
        this.isLoading = false;
        this.dispatchEvent(
          new ShowToastEvent({
            title: 'Error when updating Areas of Interest, please contact system admin',
            message: reduceErrors(error).join(', '),
            variant: 'error'
          })
        );
      })
  }

  setLevelOneTable(aoiMetadata) {
    return aoiMetadata.map(levelOne => ({
      "label": levelOne["MasterLabel"],
      "name": levelOne["Id"]
    }));
  }

  setLevelTwoTable(aoiMetadata) {
    return aoiMetadata.reduce(
      (acc, cur) => {
        if (cur["Areas_of_Interest_Level_2_Values__r"]) {
          const oneLevelTwo = cur["Areas_of_Interest_Level_2_Values__r"].map(levelTwo => ({
            "label": levelTwo["MasterLabel"],
            "name": levelTwo["Id"],
            "levelOne": levelTwo["Level_1__c"]
          }));

          return [...acc, ...oneLevelTwo];
        } else {
          return acc;
        }
      }, []
    );
  }

  calculateInitPicklist(aoiMetadata, initSelected) {
    let picklist = aoiMetadata.map(levelOne => {
      const onePicklistItem = {
        "label": levelOne["MasterLabel"],
        "name": levelOne["Id"],
        "expanded": false,
      };

      if (levelOne["Areas_of_Interest_Level_2_Values__r"]) {
        onePicklistItem.items = levelOne["Areas_of_Interest_Level_2_Values__r"].map(levelTwo => ({
          "label": levelTwo["MasterLabel"],
          "name": levelTwo["Id"],
          "expanded": false,
          "levelOne": levelOne["Id"]
        })).sort(sortArrayByLabel);
      } else {
        onePicklistItem.items = [];
      }

      return onePicklistItem;
    }).sort(sortArrayByLabel);

    // now looping initSelected list to remove selected item
    for (let i = 0; i < initSelected.length; i++) {
      const levelOneInPicklist = picklist.find(item => item.name === initSelected[i].name);

      // if current level one's child level two array is same in both picklist and selected list
      // remove whole level one from picklist
      if (levelOneInPicklist.items.length === initSelected[i].items.length) {
        picklist = picklist.filter(item => item.name !== initSelected[i].name);
      } else {
        // compare levelOneInPicklist.items with initSelected[i].items
        // and remove duplicate level two from levelOneInPicklist.items
        levelOneInPicklist.items = levelOneInPicklist.items.reduce(
          (acc, cur) => {
            const duplicate = initSelected[i].items.find(item => item.name === cur.name);

            return duplicate ? [...acc] : [...acc, cur];
          }, []
        );
      }
    }

    return picklist;
  }

  formatJson(rawJson) {
    if (!rawJson) {
      // if null or empty str, init an empty array
      return [];
    } else {
      return JSON.parse(rawJson);
    }
  }

  addSelectedHandler(event) {
    const clickedItemName = event.detail;

    if (this.isLevelOne(clickedItemName)) {
      // check if add level one with level two or without level two 
      if (this.isLevelOneWithoutLevelTwo(this._picklist, clickedItemName)) {
        // remove this level one from picklist
        this.picklist = this.buildSetterValue(REMOVE, LEVEL_ONE, clickedItemName);
      }

      // add this level one to selected list
      this.selected = this.buildSetterValue(ADD, LEVEL_ONE, clickedItemName);
    } else {
      const parentName = this._levelTwoTable.find(item => item.name === clickedItemName).levelOne;

      if (this.isLastLevelTwoInLevelOne(this._picklist, parentName)) {
        // remove this level one from picklist
        this.picklist = this.buildSetterValue(REMOVE, LEVEL_ONE, parentName);
      } else {
        // remove this level two from picklist
        this.picklist = this.buildSetterValue(REMOVE, LEVEL_TWO, clickedItemName, parentName);
      }

      // add this level two to selected list
      this.selected = this.buildSetterValue(ADD, LEVEL_TWO, clickedItemName, parentName);
    }
  }

  removeSelectedHandler(event) {
    const clickedItemName = event.detail;

    if (this.isLevelOne(clickedItemName)) {
      // check if remove level one with level two or without level two 
      if (this.isLevelOneWithoutLevelTwo(this._selected, clickedItemName)) {
        // remove this level one from selected list
        this.selected = this.buildSetterValue(REMOVE, LEVEL_ONE, clickedItemName);

        // add this level one to picklist
        this.picklist = this.buildSetterValue(ADD, LEVEL_ONE, clickedItemName);
      }
    } else {
      const parentName = this._levelTwoTable.find(item => item.name === clickedItemName).levelOne;

      // remove this level two from selected list
      this.selected = this.buildSetterValue(REMOVE, LEVEL_TWO, clickedItemName, parentName);

      // add this level two to picklist
      this.picklist = this.buildSetterValue(ADD, LEVEL_TWO, clickedItemName, parentName);
    }
  }

  isLevelOne(name) {
    return Boolean(this._levelOneTable.find(item => item.name === name));
  }

  isLevelOneWithoutLevelTwo(targetList, queryItem) {
    return Boolean(targetList.find(item => item.name === queryItem && item.items.length === 0));
  }

  isLastLevelTwoInLevelOne(targetList, queryItem) {
    return Boolean(targetList.find(item => item.name === queryItem && item.items.length === 1));
  }

  isAddLevelOne(value) {
    return value.type === ADD && value.level === LEVEL_ONE;
  }

  isAddLevelTwo(value) {
    return value.type === ADD && value.level === LEVEL_TWO;
  }

  isRemoveLevelOne(value) {
    return value.type === REMOVE && value.level === LEVEL_ONE;
  }

  isRemoveLevelTwo(value) {
    return value.type === REMOVE && value.level === LEVEL_TWO;
  }

  buildSetterValue(type, level, name, parentName) {
    return {
      "type": type,
      "level": level,
      "name": name,
      "parentName": parentName
    };
  }

  buildNewList(targetList, value) {
    if (this.isAddLevelOne(value)) {
      const existingLevelOne = targetList.find(item => item.name === value.name);

      if (!existingLevelOne) {
        const newLevelOne = this.buildNewItem(value.level, value.name);

        return [...targetList, newLevelOne].sort(sortArrayByLabel);
      } else {
        return [...targetList];
      }
    } else if (this.isAddLevelTwo(value)) {
      // check if target list has parent level one
      const parentItem = targetList.find(item => item.name === value.parentName);

      if (parentItem) {
        // if has parent level one, build a new level two and add in
        return targetList.reduce(
          (acc, cur) => {
            // if looping current parent level one
            if (cur.name === value.parentName) {
              const newLevelTwo = this.buildNewItem(value.level, value.name);

              return [...acc, { ...cur, "expanded": true, "items": [...cur.items, newLevelTwo].sort(sortArrayByLabel) }];
            } else {
              return [...acc, cur];
            }
          }, []
        );
      } else {
        // if no parent level one in list, build a new level one first and then build level two 
        const newLevelOne = this.buildNewItem(LEVEL_ONE, value.parentName);
        const newLevelTwo = this.buildNewItem(value.level, value.name);
        newLevelOne.items = [newLevelTwo];

        return [...targetList, newLevelOne].sort(sortArrayByLabel);
      }
    } else if (this.isRemoveLevelOne(value)) {
      return targetList.filter(item => item.name !== value.name);
    } else if (this.isRemoveLevelTwo(value)) {
      return targetList.reduce(
        (acc, cur, index, arr) => {
          if (cur.name === value.parentName) {
            const existingLevelOne = arr.find(item => item.name === value.parentName);

            return [...acc, { ...existingLevelOne, "expanded": true, "items": existingLevelOne.items.filter(item => item.name !== value.name) }];
          } else {
            return [...acc, cur];
          }
        }, []
      );
    }
  }

  buildNewItem(level, name) {
    let itemInTable;

    itemInTable = level === LEVEL_ONE
      ? this._levelOneTable.find(item => item.name === name)
      : this._levelTwoTable.find(item => item.name === name);

    const newItem = {
      "expanded": true,
      "label": itemInTable.label,
      "name": itemInTable.name,
      "items": []
    }

    if (level === LEVEL_TWO) {
      newItem.levelOne = itemInTable.levelOne;
    }

    return newItem;
  }

  navigateToRecordPage(recordId) {
    this[NavigationMixin.Navigate]({
      type: 'standard__recordPage',
      attributes: {
        recordId: recordId,
        actionName: 'view'
      }
    });
  }
}