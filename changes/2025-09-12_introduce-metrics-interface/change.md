[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Adding a Metrics Interface to Crypto Tools Libraries

## Affected APIs or Client Configurations

This serves as a reference of all APIs and Client Configurations that this change affects.
This list is not exhaustive. Any downstream consumer of any API or client configuration SHOULD
also be updated as part of this proposed changed. This list contains the obvious changes that
would need to happen in order to support a metrics interface.

| API/ Configuration                                                                      |
| --------------------------------------------------------------------------------------- |
| [Encrypt](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/client-apis/encrypt.md) |
| [Decrypt](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/client-apis/decrypt.md) |
| [GetEncryptionMaterials](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/cmm-interface.md#get-encryption-materials)|
| [DecryptionMaterials](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/cmm-interface.md#decrypt-materials)|
| [OnEncrypt](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/keyring-interface.md#onencrypt)|
| [OnDecrypt](https://github.com/awslabs/aws-encryption-sdk-specification/blob/master/framework/keyring-interface.md#ondecrypt)|
| [DynamoDB Table Encryption Config](https://github.com/aws/aws-database-encryption-sdk-dynamodb/blob/main/specification/dynamodb-encryption-client/ddb-table-encryption-config.md)|

## Affected Libraries

| Library  | Version Introduced  | Implementation |
| -------- | ------------------- | -------------- |
| ESDK     | T.B.D               | [ESDK.smithy](https://github.com/aws/aws-encryption-sdk/blob/mainline/AwsEncryptionSDK/dafny/AwsEncryptionSdk/Model/esdk.smithy)|
| MPL      | T.B.D               | [material-provider.smithy](https://github.com/aws/aws-cryptographic-material-providers-library/blob/main/AwsCryptographicMaterialProviders/dafny/AwsCryptographicMaterialProviders/Model/material-provider.smithy)|
| DB-ESDK  | T.B.D               | [DynamoDbEncryption.smithy](https://github.com/aws/aws-database-encryption-sdk-dynamodb/blob/main/DynamoDbEncryption/dafny/DynamoDbEncryption/Model/DynamoDbEncryption.smithy)|

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).
