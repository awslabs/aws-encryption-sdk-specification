# Structures

## Version

0.1.0-preview

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Overview

This document includes the specifications for common structures referenced throughout the
AWS Encryption SDK specification.
These structures define a group of related fields that MUST hold certain properties.
Wherever these structures are referenced in this specification,
implementations MUST ensure that all properties of a structure's fields are upheld.

Note that this specification does not specify how these structures should be represented or passed
throughout the AWS Encryption SDK framework.
While these structures will usually be represented as objects, lower level languages MAY represent
these fields in a less strictly defined way as long as all field properties are still upheld.

Structures defined in this document:

- [Encrypted Data Key](#encrypted-data-key)
- [Encryption Context](#encryption-context)
- [Encryption Materials](#encryption-materials)
- [Decryption Materials](#decryption-materials)
- [Keyring Trace](#keyring-trace)

### Encrypted Data Key

#### Implementations

- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/EncryptedDataKey.java)
- [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/structures.py)
- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/include/aws/cryptosdk/edk.h)
- [Javascript](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management/src/encrypted_data_key.ts)

#### Structure

An encrypted data key is comprised of the following fields:

- [Key Provider ID](#key-provider-id)
- [Key Provider Information](#key-provider-information)
- [Ciphertext](#ciphertext)

Note: "Encrypted" is a misnomer here, as the process by which a key provider may obtain the plaintext data key
from the ciphertext and vice versa does not have to be an encryption and decryption cipher.
This specification uses the terms "encrypt" and "decrypt" for simplicity,
but the actual process by which a key provider obtains the plaintext data key from the ciphertext
and vice versa MAY be any reversible operation, though we expect that most will use encryption.

##### Key Provider ID

A UTF-8 encoded value related to the [key provider](#key-provider.md) that encrypted this data key.

This value usually represents the namespace of the [key provider] (#key-provider.md) defined wrapping key
used to encrypt the plaintext data key.

For example, [encrypted data keys](#encrypted-data-key) encrypted by the [KMS Keyring](#kms-keyring.md)
have the value of "aws-kms" in this field.

This value MUST NOT be "aws-kms" unless this encrypted data key was produced by the [KMS Keyring](#kms-keyring.md).

##### Key Provider Information

Information related to the [key provider](#key-provider.md).
Its structure and meaning is specified by the key provider that encrypted this data key.

This is usually a UTF-8 encoded value.
This value is usually the name of a key provider defined wrapping key that is used to encrypt the plaintext data key.
However, the [raw AES keyring](#raw-aes-keyring.md) defines a specific structure for the key provider information
that includes more information.

##### Ciphertext

An opaque value from which an appropriate key provider can obtain the plaintext data key.

Some key provider MUST be capable of deterministically obtaining the plaintext key from the ciphertext.

Most commonly this is an encrypted form of the plaintext data key.
Alternatively it could be the public input to a KDF that derives the plaintext data key or
an identifier into a key store that will return the plaintext data key.

### Encryption Context

#### Implementations

- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/internal/EncryptionContextSerializer.java)
- [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/internal/formatting/encryption_context.py)
- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/include/aws/cryptosdk/enc_ctx.h)
- [Javascript](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management/src/types.ts)

#### Structure

The encryption context is a key-value mapping of arbitrary, non-secret, UTF-8 encoded strings.
It is used during [encryption](#encrypt.md) and [decryption](#decrypt.md) to provide additional authenticated data (AAD).

Users SHOULD use the encryption context to store:

- non-secret data that MUST remain associated with the [message](#message.md) ciphertext.
- data that is useful in logging and tracking, such as data about the file type, purpose, or ownership.

Users MUST NOT use the encryption context to store secret data.

The encryption context MUST reserve the following key fields for use by the AWS Encryption SDK:

- `aws-crypto-public-key` (See [the Default CMM spec](#default-cmm.md) for its use)

The encryption context SHOULD reserve any key field with the prefix `aws` for use by AWS KMS and
other AWS services.

### Encryption Materials

#### Implementations

- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/model/EncryptionMaterials.java)
- [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/materials_managers/__init__.py)
- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/include/aws/cryptosdk/materials.h)
- [Javascript](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management/src/cryptographic_material.ts)

#### Structure

Encryption materials are a structure containing materials needed for [encryption](#encrypt.md).
This structure MAY include any of the following fields:

- [Algorithm Suite](#algorith-suite)
- [Encrypted Data Keys](#encrypted-data-keys)
- [Encryption Context](#encryption-context)
- [Keyring Trace](#keyring-trace)
- [Plaintext Data Key](#plaintext-data-key)
- [Signing Key](#signing-key)

##### Algorithm Suite

The [algorithm suite](#algorithm-suites.md) to be used for [encryption](#encrypt.md).

##### Encrypted Data Keys

A list of the [encrypted data keys](#encrypted-data-key) that correspond to the plaintext data key.

The [ciphertext](#ciphertext) of each encrypted data key in this list MUST be an opaque form of the
plaintext data key from this set of encryption materials.

If the plaintext data key is not included on this set of encryption materials, this list MUST be empty.

##### Encryption Context

The [encryption context](#encryption-context) associated with this [encryption](#encrypt.md).

##### Keyring Trace

A [keyring trace](#keyring-trace) containing all of the actions that keyrings have taken on this set
of encryption materials.

##### Plaintext Data Key

A data key to be used as input for [encryption](#encrypt.md).

The plaintext data key MUST:

- fit the specification for the [key derivation algorithm](#algorithm-suites.md#key-derivation-algorithm)
  included in this decryption material's [algorithm suite](#algorithm-suite).
- consist of cryptographically secure (pseudo-)random bits.
- be kept secret.

The plaintext data key SHOULD be stored as immutable data.

The plaintext data key SHOULD offer an interface to zero the plaintext data key

##### Signing Key

The key to be used as the signing key for signature verification during [encryption](#encrypt.md).

The signing key MUST fit the specification described by the [signature algorithm](#algorithm-suites.md#signature-algorithm)
included in this encryption material's [algorithm suite](#algorithm-suite).

The value of this key MUST be kept secret.

### Decryption Materials

#### Implementations

- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/model/DecryptionMaterials.java)
- [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/materials_managers/__init__.py)
- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/include/aws/cryptosdk/materials.h)
- [Javascript](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management/src/cryptographic_material.ts)

#### Structure

Decryption materials are a structure containing materials needed for [decryption](#decrypt.md).
This structure MAY include any of the following fields:

- [Algorithm Suite](#algorith-suite)
- [Encryption Context](#encryption-context)
- [Keyring Trace](#keyring-trace)
- [Plaintext Data Key](#plaintext-data-key)
- [Verification Key](#verification-key)

##### Algorithm Suite

The [algorithm suite](#algorithm-suites.md) to be used for [decryption](#decrypt.md)

##### Encryption Context

The [encryption context](#encryption-context) associated with this [encryption](#encrypt.md)

##### Keyring Trace

A [keyring trace](#keyring-trace) containing all of the actions keyrings have taken on this set of decryption materials.

##### Plaintext Data Key

The data key to be used as input for [decryption](#decrypt.md).

The plaintext data key MUST:

- fit the specification for the [encryption algorithm](#algorithm-suites.md#encryption-algorithm)
  included in this decryption material's [algorithm suite](#algorithm-suite).
- consist of cryptographically secure (pseudo-)random bits.
- be kept secret.

The plaintext data key SHOULD be stored as immutable data.

The plaintext data key SHOULD offer an interface to zero the plaintext data key

##### Verification Key

The key to be used as the verification key for signature verification during [decryption](#decrypt.md).

The verification key MUST fit the specification for the [signature algorithm](#algorithm-suites.md#signature-algorithm)
included in this decryption material's [algorithm suite](#algorithm-suite).

### Keyring Trace

#### Implementations

- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/keyring_trace.c)
- [Javascript](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management/src/keyring_trace.ts)

#### Structure

A list of traces, representing actions that keyrings have taken on data keys.

The list MUST be ordered sequentially according to the order the actions were taken,
with the earliest action corresponding to the first trace in the list.

A trace is a structure that MAY contain any number of string fields,
but MUST contain the following field:

- [Flags](#flags)

##### Flags

A field representing a set of one or more enums indicating what actions were taken by a keyring.

This set MUST include at least one flag.

The following list contains the supported flags:

- [GENERATED DATA KEY](#generated-data-key)
- [ENCRYPTED DATA KEY](#encrypted-data-key)
- [DECRYPTED DATA KEY](#decrypted-data-key)
- [SIGNED ENCRYPTION CONTEXT](#signed-encryption-context)
- [VERIFIED ENCRYPTION CONTEXT](#verified-encryption-context)

Note: the underlying value of each enum is implementation specific.

###### GENERATED DATA KEY

A flag to represent that a keyring has generated a plaintext data key.
This flag MUST be included in a trace if the keyring has successfully performed the
[generate data key](#keyring-interface.md#generate-data-key) behavior.

###### ENCRYPTED DATA KEY

A flag to represent that a keyring has created an [encrypted data key](#encrypted-data-key).
This flag MUST be included in a trace if and only if the keyring has successfully performed the
[encrypt data key](#keyring-interface.md#encrypt-data-key) behavior.

###### DECRYPTED DATA KEY

A flag to represent that a keyring has obtained the corresponding plaintext data key from an [encrypted data key](#encrypted-data-key).
This flag MUST be included in a trace if and only if the keyring has successfully performed the
[decrypt data key](#keyring-interface.md#decrypt-data-key) behavior.

###### SIGNED ENCRYPTION CONTEXT

A flag to represent that the keyring has cryptographically bound the [encryption context](#encryption-context)
to a newly created [encrypted data key](#encrypted-data-key).

This flag MUST be included in a trace if and only if the keyring has successfully performed the
[encrypt data key](#keyring-interface.md#encrypt-data-key) behavior to create an [encrypted data-key](#encrypted-data-key)
that has the following property:

- If the encryption context used as input to OnEncrypt to produce the encrypted data key is
  different than the encryption context inputted to OnDecrypt to decrypt the encrypted data key,
  the decryption is overwhelmingly likely to fail.

###### VERIFIED ENCRYPTION CONTEXT

A flag to represent that the keyring has verified that an [encrypted data key](#encrypted-data-key) was
originally created with a particular [encryption context](#encryption-context).

This flag MUST be included in a trace if and only if the keyring has successfully performed the
[decrypt data key](#keyring-interface.md#decrypt-data-key) behavior to decrypt an [encrypted data key](#encrypted-data-key)
that has the following property:

- If the encryption context used as input to OnEncrypt to produce the encrypted data key is
  different than the encryption context inputted to OnDecrypt to decrypt the encrypted data key,
  the decryption is overwhelmingly likely to fail.
