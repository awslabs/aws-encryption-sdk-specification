[//]: # (Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.)
[//]: # (SPDX-License-Identifier: CC-BY-SA-4.0)

# Master Key Provider Keyring

## Version

0.1.0-preview

## Implementations

- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/keyrings/MasterKeyProviderKeyring.java)
- [Python](https://github.com/aws/aws-encryption-sdk-python/src/aws_encryption_sdk/keyrings/master_key.py)

## Overview

A keyring which wraps a legacy [Master Key Provider](master-key-provider-interface.md) to facilitate transitioning to [Keyrings](./keyring-interface.md).

### Legacy

Master Key Providers are a legacy construct that have been supplanted by [Keyrings](./keyring-interface.md). 
The Master Key Provider Keyring should only be used when interfacing with Master Key Providers that cannot otherwise be
transitioned to keyrings.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Inputs

On keyring initialization, a keyring MUST define the following:

- [Master Key Provider](#master-key-provider)

### Master Key Provider

A [master key provider](master-key-provider-interface.md) that can decrypt data keys using available [master keys](master-key-interface.md)
 as well as provide [master keys](master-key-interface.md) for use in encryption.

## Operation

### OnEncrypt

This keyring MUST acquire a list of [master keys](master-key-interface.md) by calling the master key provider's [Get Master Keys for Encryption](master-key-provider-interface.md#get-master-keys-for-encryption)
using the [encryption context](structures.md#encryption-context) from the [encryption materials](structures.md#encryption-materials) as input. If the 
master key provider does not provide any master keys, OnEncrypt MUST fail.

If the input [encryption materials](structures.md#encryption-materials) do not contain a [plaintext data key](structures.md#plaintext-data-key), OnEncrypt MUST
attempt to generate a new plaintext data key and encrypt that data key by calling [Generate Data Key](master-key-interface.md#generate-data-key)
on the first (primary) [master key](master-key-interface.md) provided by the master key provider.

If the call to Generate Data Key does not succeed, OnEncrypt MUST NOT modify the encryption materials and MUST fail.

If the call succeeds, OnEncrypt MUST do the following with the response from [Generate Data Key](master-key-interface.md#generate-data-key)
- set the plaintext data key on the [encryption materials](structures.md#encryption-materials)
- append a new [encrypted data key](structures.md#encrypted-data-key) to the encrypted data key list
  in the [encryption materials](structures.md#encryption-materials), constructed as follows:
  - the [ciphertext](structures.md#ciphertext) is the response encrypted data key.
  - the [key provider id](structures.md#key-provider-id) is the provider id of the primary master key.
  - the [key provider information](structures.md#key-provider-information) is the key id of the primary master key.
- append a new record to the [keyring trace](structures.md#keyring-trace) 
  in the input [encryption materials](structures.md#encryption-materials), constructed as follows:
  - The string field KeyNamespace contains the provider id of the primary master key.
  - The string field KeyName contains the key id of the primary master key.
  - The [flags](structures.md#flags) field of this record includes the following flags:
    - [GENERATED DATA KEY](structures.md#flags)
    - [ENCRYPTED DATA KEY](structures.md#flags)
    - [SIGNED ENCRYPTION CONTEXT](structures.md#flags) (if the master key supports encryption context signing)

Next, for each [master key](master-key-interface.md) provided by the master key provider's 
[Get Master Keys for Encryption](master-key-provider-interface.md#get-master-keys-for-encryption), the keyring MUST call
 [EncryptDataKey](master-key-interface.md#encrypt-data-key). If the primary master key was used to generate a data key,
 that master key MUST NOT be used again for encryption.
 
 The input to [EncryptDataKey](master-key-interface.md#encrypt-data-key) MUST contain the following from the [encryption materials](structures.md#encryption-materials):
 - [Algorithm Suite](structures.md#algorithm-suite)
 - [Encryption Context](structures.md#encryption-context)
 - [Plaintext Data Key](structures.md#plaintext-data-key)
 
If any master key's [EncryptDataKey](master-key-interface.md#encrypt-data-key) fails, OnEncrypt MUST fail.

For each master key, OnEncrypt MUST do the following with the response from [Encrypt Data Key](master-key-interface.md#encrypt-data-key)
- append a new [encrypted data key](structures.md#encrypted-data-key) to the encrypted data key list
  in the [encryption materials](structures.md#encryption-materials), constructed as follows:
  - the [ciphertext](structures.md#ciphertext) is the response encrypted data key.
  - the [key provider id](structures.md#key-provider-id) is the provider id of the master key.
  - the [key provider information](structures.md#key-provider-information) is the key id of the master key.
- append a new record to the [keyring trace](structures.md#keyring-trace)
  in the input [encryption materials](structures.md#encryption-materials), constructed as follows:
  - The string field KeyNamespace contains the provider id of the master key.
  - The string field KeyName contains the key id of the master key.
  - The [flags](structures.md#flags) field of this record includes the following flags:
    - [ENCRYPTED DATA KEY](structures.md#flags)
    - [SIGNED ENCRYPTION CONTEXT](structures.md#flags) (if the master key supports encryption context signing)

### OnDecrypt

If the input [decryption materials](structures.md#decryption-materials) contain a plaintext data key,
OnDecrypt MUST immediately return the unmodified decryption materials.

Otherwise, OnDecrypt MUST attempt to decrypt the [encrypted data keys](structures.md#encrypted-data-key)
in the input using [Decrypt Data Key](master-key-provider-interface.md#decrypt-data-key)
on the [master key provider](master-key-provider-interface.md).

The input to [DecryptDataKey](master-key-provider-interface.md#decrypt-data-key) MUST contain the following:
 - [Algorithm Suite](structures.md#algorithm-suite)  from the input [decryption materials](structures.md#decryption-materials)
 - [Encryption Context](structures.md#encryption-context) from the input [decryption materials](structures.md#decryption-materials)
 - [Encrypted Data Keys](structures.md#plaintext-data-key) from the input

If OnDecrypt fails to successfully decrypt the [encrypted data keys](structures.md#encrypted-data-key),
then OnDecrypt MUST output the unmodified input [decryption materials](structures.md#decryption-materials).

Otherwise, OnDecrypt MUST do the following with the response from [Decrypt Data Key](master-key-provider-interface.md#decrypt-data-key)
- set the plaintext data key on the [decryption materials](structures.md#decryption-materials)
- append a new record to the [keyring trace](structures.md#keyring-trace)
  in the input [encryption materials](structures.md#encryption-materials), constructed as follows:
  - The string field KeyNamespace contains the provider id of the master key that was used to decrypt the data key.
  - The string field KeyName contains the key id of the master key that was used to decrypt the data key.
  - The [flags](structures.md#flags) field of this record includes the following flags:
    - [DECRYPTED DATA KEY](structures.md#flags)
    - [VERIFIED ENCRYPTION CONTEXT](structures.md#flags) (if the master key used to decrypt the data key supports encryption context signing)
- immediately return the modified [decryption materials](structures.md#decryption-materials).
