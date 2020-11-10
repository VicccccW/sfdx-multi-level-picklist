public without sharing class AreasOfInterestController {
  @AuraEnabled(Cacheable=true)
  public static List<Areas_of_Interest_Level_1_Value__mdt> getLevelOneAndRelatedLevelTwoValues() {
    try {
      return [
        SELECT
          Id,
          MasterLabel,
          DeveloperName,
          (
            SELECT Id, MasterLabel, DeveloperName
            FROM Areas_of_Interest_Level_2_Values__r
          )
        FROM Areas_of_Interest_Level_1_Value__mdt
      ];
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}
