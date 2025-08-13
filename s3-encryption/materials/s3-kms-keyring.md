[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# KMS w/Context Keyring

## Overview

A keyring which interacts with AWS Key Management Service (AWS KMS) to create, encrypt, and decrypt data keys using AWS KMS keys.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Interface

The KmsKeyring MUST implement the [Keyring interface](keyring-interface.md#interface) and include the behavior described in the [S3 Keyring](s3-keyring.md).

## Initialization

On initialization, the caller MAY provide an AWS KMS SDK client instance.
If the caller does not provide an AWS KMS SDK client instance or provides a null value, the KmsKeyring MUST create a default KMS client instance.
On initialization, the caller MUST provide an AWS KMS key identifier.

The KmsKeyring MAY validate that the AWS KMS key identifier is not null or empty.
The KmsKeyring MAY validate that the AWS KMS key identifier is [a valid AWS KMS Key identifier](../../framework/aws-kms/aws-kms-key-arn.md#a-valid-aws-kms-identifier).

## Supported Wrapping Algorithm Modes

The KmsKeyring has two supported algorithm modes: KmsV1 and Kms+Context (V2).
The KmsKeyring MUST NOT support encryption using KmsV1 mode.
The KmsKeyring MUST support encryption using Kms+Context mode.
The KmsKeyring MUST support decryption using KmsV1 mode.
The KmsV1 mode MUST be only enabled when legacy wrapping algorithms are enabled.
The KmsKeyring MUST support decryption using Kms+Context mode.

## OnEncrypt

The KmsKeyring MUST call the S3 Keyring's OnEncrypt method.
The KmsKeyring SHOULD defer all of its functionality to the S3 Keyring.

### EncryptDataKey

The KmsKeyring MUST implement the EncryptDataKey method.
The keyring MUST call [AWS KMS Encrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html) using the configured AWS KMS client.
The keyring MUST AWS KMS Encrypt call with a request constructed as follows:

- `KeyId` MUST be the configured AWS KMS key identifier.
- `PlaintextDataKey` MUST be the plaintext data key in the [encryption materials](../structures.md#encryption-materials).
- `EncryptionContext` MUST be the [encryption context](../structures.md#encryption-context) included in the input [encryption materials](../structures.md#encryption-materials).

If the call to [AWS KMS Encrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html) does not succeed, OnEncrypt MUST fail.

If the Encrypt call succeeds the response’s `KeyId` MUST be [A valid AWS KMS key ARN](aws-kms-key-arn.md#a-valid-aws-kms-arn). If verified, OnEncrypt MUST append a new [encrypted data key](../structures.md#encrypted-data-key) to the encrypted data key list in the [encryption materials](../structures.md#encryption-materials), constructed as follows:

- The [ciphertext](../structures.md#ciphertext) MUST be the response `CiphertextBlob`.
- The [key provider id](../structures.md#key-provider-id) MUST be "kms+context".

If all Encrypt calls succeed, EncryptDataKey MUST output the modified [encryption materials](../structures.md#encryption-materials).

## OnDecrypt

The KmsKeyring MUST call the S3 Keyring's OnDecrypt method.
The KmsKeyring SHOULD defer all of its functionality to the S3 Keyring.

### DecryptDataKey

The KmsKeyring MUST determine whether to decrypt using KmsV1 mode or Kms+Context mode.
If the Key Provider Info of the Encrypted Data Key is "kms", the KmsKeyring MUST attempt to decrypt using KmsV1 mode.
If the Key Provider Info of the Encrypted Data Key is "kms+context", the KmsKeyring MUST attempt to decrypt using Kms+Context mode.

#### KmsV1

To attempt to decrypt a particular [encrypted data key](../structures.md#encrypted-data-key), the KmsKeyring MUST call [AWS KMS Decrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html) with the configured AWS KMS client.

When calling [AWS KMS Decrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html), the keyring MUST call with a request constructed as follows:

- `KeyId` MUST be the configured AWS KMS key identifier.
- `CiphertextBlob` MUST be the [encrypted data key ciphertext](../structures.md#ciphertext).
- `EncryptionContext` MUST be the [encryption context](../structures.md#encryption-context) included in the input [decryption materials](../structures.md#decryption-materials).
- A custom API Name or User Agent string SHOULD be provided in order to provide metrics on KMS calls associated with the S3 Encryption Client.

The KmsKeyring MUST immediately return the plaintext as a collection of bytes.
If the KmsKeyring fails to successfully decrypt the [encrypted data key](../structures.md#encrypted-data-key), then it MUST throw an exception.

#### Kms+Context

To attempt to decrypt a particular [encrypted data key](../structures.md#encrypted-data-key), the KmsKeyring MUST call [AWS KMS Decrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html) with the configured AWS KMS client.

When decrypting using Kms+Context mode, the KmsKeyring MUST validate the provided (request) encryption context with the stored (materials) encryption context.
The stored encryption context with the two reserved keys removed MUST match the provided encryption context.
If the stored encryption context with the two reserved keys removed does not match the provided encryption context, the KmsKeyring MUST throw an exception.

When calling [AWS KMS Decrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html), the keyring MUST call with a request constructed as follows:

- `KeyId` MUST be the configured AWS KMS key identifier.
- `CiphertextBlob` MUST be the [encrypted data key ciphertext](../structures.md#ciphertext).
- `EncryptionContext` MUST be the [encryption context](../structures.md#encryption-context) included in the input [decryption materials](../structures.md#decryption-materials).
- A custom API Name or User Agent string SHOULD be provided in order to provide metrics on KMS calls associated with the S3 Encryption Client.

The KmsKeyring MUST immediately return the plaintext as a collection of bytes.
If the KmsKeyring fails to successfully decrypt the [encrypted data key](../structures.md#encrypted-data-key), then it MUST throw an exception.
