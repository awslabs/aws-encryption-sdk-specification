// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

structure KeyStoreConfig {

  @required
  kmsConfiguration: KMSConfiguration,
  @required
  logicalKeyStoreName: String,

  id: String,

  // These properties are about storage
  storage: Storage
  ddbTableName: TableName,
  ddbClient: DdbClientReference,

  // These properties are about authentication/authorization
  auth: Auth,
  grantTokens: GrantTokenList,
  kmsClient: KmsClientReference,

}

union Storage {
  ddb: DynamoDBTable
  custom: EncryptedKeyStore
}

structure DynamoDBTable {
  @required
  ddbTableName: TableName,
  ddbClient: DdbClientReference,
}

union Auth {
  kms: AwsKms,
}

structure AwsKms {
  grantTokens: GrantTokenList,
  kmsClient: KmsClientReference,
}

enum BranchKeyType {
    ACTIVE_BRANCH_KEY
    BRANCH_KEY_VERSION
}

enum BranchKeyKind {
  HIERARCHICAL_SYMMETRIC
}

structure EncryptedBranchKey {
  @required
  Identifier: Utf8Bytes,

  @required
  Type: BranchKeyType,

  @required
  Kind: BranchKeyKind,

  @required
  Version: Utf8Bytes,

  @required
  CreateTime: Utf8Bytes,

  @required
  KmsArn: Utf8Bytes,

  @required
  EncryptionContext: EncryptionContext,

  @required
  CiphertextBlob: blob,
}

structure EncryptedBeaconKey {
  @required
  Identifier: Utf8Bytes,

  @required
  CreateTime: Utf8Bytes,

  @required
  KmsArn: Utf8Bytes,

  @required
  EncryptionContext: EncryptionContext,

  @required
  CiphertextBlob: blob,
}

union EncryptedBranchItem {
  BranchKey: EncryptedBranchKey
}

union EncryptedBeaconItem {
  BeaconKey: EncryptedBeaconKey
}

@extendable
resource EncryptedKeyStore {
  operations: [
    GetEncryptedActiveBranchKey,
    GetEncryptedBranchKeyVersion,
    GetEncryptedBeaconKey,
  ]
}

@reference(resource: EncryptedKeyStore)
structure EncryptedKeyStoreReference {}

operation GetEncryptedActiveBranchKey {
  input: GetEncryptedActiveBranchKeyInput,
  output: GetEncryptedActiveBranchKeyOutput,
}
operation GetEncryptedBranchKeyVersion {
  input: GetEncryptedBranchKeyVersionInput,
  output: GetEncryptedBranchKeyVersionOutput,
}
operation GetEncryptedBeaconKey {
  input: GetEncryptedBeaconKeyInput,
  output: GetEncryptedBeaconKeyOutput,
}

structure GetEncryptedActiveBranchKeyInput{
  @required
  Identifier: Utf8Bytes,
}
structure GetEncryptedActiveBranchKeyOutput{
  Item: EncryptedBranchItem,
}
structure GetEncryptedBranchKeyVersionInput{
  @required
  Identifier: Utf8Bytes,
  @required
  Version: Utf8Bytes,
}
structure GetEncryptedBranchKeyVersionOutput{
  Item: EncryptedBranchItem,
}
structure GetEncryptedBeaconKeyInput{
  @required
  Identifier: Utf8Bytes,
}
structure GetEncryptedBeaconKeyOutput{
  Item: EncryptedBeaconItem,
}