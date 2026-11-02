// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
namespace aws.cryptography.keyStoreAdmin

// The top level namespace for this project.
// Contains an entry-point for helper methods,
// and common structures used throughout this project.

use aws.polymorph#localService

use com.amazonaws.dynamodb#DynamoDB_20120810
use com.amazonaws.kms#TrentService

use aws.cryptography.keyStore#EncryptionContext

@localService(
  sdkId: "KeyStoreAdmin",
  config: KeyStoreAdminConfig,
  dependencies: [
    DynamoDB_20120810,
    TrentService
  ] 
)
service KeyStoreAdmin {
  version: "2023-04-01",
  operations: [
    CreateKey
    VersionKey
  ],
  errors: [
    KeyStoreAdminException
    aws.cryptography.keyStore#VersionRaceException
  ]
}

structure KeyStoreAdminConfig {
  @required
  @documentation(
  "The logical name for this Key Store,
  which is cryptographically bound to the keys it holds.
  This appears in the Encryption Context of KMS requests as `tablename`.

  There SHOULD be a one to one mapping between the Storage's physical name,
  i.e: DynamoDB Table Names,
  and the Logical KeyStore Name.
  This value can be set to the DynamoDB table name itself
  (Storage's physical name),
  but does not need to.

  Controlling this value independently enables restoring from DDB table backups
  even when the table name after restoration is not exactly the same.")
  logicalKeyStoreName: String,

  @required
  @documentation("The storage configuration for this Key Store.")
  storage: aws.cryptography.keyStore#Storage
}

// KMS Arn validation MUST occur in Dafny
union KMSIdentifier {
  @documentation(
  "Key Store is restricted to only this KMS Key ARN.
  If a different KMS Key ARN is encountered
  when creating, versioning, or getting a Branch Key or Beacon Key,
  KMS is never called and an exception is thrown.
  While a Multi-Region Key (MKR) may be provided,
  the whole ARN, including the Region,
  is persisted in Branch Keys and
  MUST strictly equal this value to be considered valid.")
  kmsKeyArn: String,

  @documentation(
  "If an MRK ARN is provided,
  and the persisted Branch Key holds an MRK ARN,
  then those two ARNs may differ in region,
  although they must be otherwise equal.
  If either ARN is not an MRK ARN, then
  kmsMRKeyArn behaves exactly as kmsKeyArn.")
  kmsMRKeyArn: String,
}

structure AwsKmsDecryptEncrypt {
  @documentation("The KMS Client (and Grant Tokens) used to Decrypt Branch Key Store Items.")
  decrypt: aws.cryptography.keyStore#AwsKms
  @documentation(
    "The KMS Client (and Grant Tokens) used to Encrypt Branch Key Store Items
     and to Generate new Cryptographic Material.")
  encrypt: aws.cryptography.keyStore#AwsKms
}

@documentation(
  "This configures which Key Management Operations will be used
   AND the Key Management Clients (and Grant Tokens) used to invoke those Operations.")
union KeyManagementStrategy {
  @documentation(
  "Key Store Items are authenicated and re-wrapped via KMS ReEncrypt,
  executed with the provided Grant Tokens and KMS Client.
  This is one request to Key Management, as compared to two.
  But only one set of credentials can be used.")
  AwsKmsReEncrypt: aws.cryptography.keyStore#AwsKms
  @documentation(
    "Key Store Items are authenicated and re-wrapped via a Decrypt and then Encrypt request.
     This is two separate requests to Key Management, as compared to one. 
     But the Decrypt requests will use the Decrypt KMS Client (and Grant Tokens),
     while the Encrypt requests will use the Encrypt KMS Client (and Grant Tokens).
     This option affords for different credentials to be utilized,
     based on the operation.
     When Generating new material,
     KMS GenerateDataKeyWithoutPlaintext will be executed against
     the Encrypt option.")
  AwsKmsDecryptEncrypt: AwsKmsDecryptEncrypt
}

@documentation(
"Create a new Branch Key in the Key Store.
Additionally create a Beacon Key that is tied to this Branch Key.")
operation CreateKey {
  input: CreateKeyInput,
  output: CreateKeyOutput
}

structure CreateKeyInput {
  @documentation("The identifier for the created Branch Key.")
  branchKeyIdentifier: String,

  @documentation(
  "Custom encryption context for the Branch Key.
  Required if branchKeyIdentifier is set.")
  encryptionContext: aws.cryptography.keyStore#EncryptionContext

  @required
  @documentation(
  "Multi-Region or Single Region AWS KMS Key
  used to protect the Branch Key, but not aliases!")
  kmsArn: KMSIdentifier

  strategy: KeyManagementStrategy
}

structure CreateKeyOutput {
  @required
  @documentation("A identifier for the created Branch Key.")
  branchKeyIdentifier: String
}

@documentation(
  "Create a new ACTIVE version of an existing Branch Key,
   along with a complementing Version (DECRYT_ONLY) in the Key Store.
   This generates a fresh AES-256 key which all future encrypts will use
   for the Key Derivation Function,
   until VersionKey is executed again.")
operation VersionKey {
  input: VersionKeyInput,
  output: VersionKeyOutput,
  errors: [aws.cryptography.keyStore#VersionRaceException]
}

structure VersionKeyInput {
  @required
  @documentation("The identifier for the Branch Key to be versioned.")
  branchKeyIdentifier: String

  @required
  @documentation("Multi-Region or Single Region AWS KMS Key used to protect the Branch Key, but not aliases!")
  kmsArn: KMSIdentifier

  strategy: KeyManagementStrategy
}

structure VersionKeyOutput {
}
