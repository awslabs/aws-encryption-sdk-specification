# Cryptographic Materials Manager Interface

## Current Implementations

- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/include/aws/cryptosdk/materials.h)
- [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/materials_managers/__init__.py)
- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/CryptoMaterialsManager.java)
- [Javascript](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management/src/materials_manager.ts)

## Overview

The Cryptographic Materials Manager (CMM) assembles the cryptographic materials used to encrypt the [message](#message.md) and decrypt the encrypted messages.  
The CMM interface describes the interface that all CMMs MUST implement.

# Definitions

## Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" 
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Supported CMMs

The AWS Encryption SDK provides the following built-in CMM types:

- [Default CMM](#default-cmm.md)
- [Caching CMM](#caching-cmm.md)

Note: A user MAY create their own custom CMM.

## Interface

### Structures

The CMM MUST interface with the following structures:

- [Encryption Materials Request](#encryption-materials-request)
- [Decryption Materials Request](#decryption-materials-request)

#### Encryption Materials Request

The CMM receives an encryption materials request from a user and attempts to [get encryption materials](#get-encryption-materials). 

The encryption materials request MUST include the following:

- [Encryption Context](#message-header.md#encryption-context)
    - The encryption context provided MAY be empty.

The encryption request MAY include the following:

- [Algorithm Suite](#algorithm-suite.md)
- [Plain Text Length](#encrypt.md)
    - This value represents the upper-bound for the plain text to be encrypted. 

#### Decrypt Materials Request

The CMM receives a decrypt materials request from a user and attempts to [decrypt some encrypted materials](#decrypt-materials).

The decrypt materials request MUST include the following:

- [Algorithm Suite](#algorithm-suite.md)
- [Encrypted Data Keys](#data-structures.md#encrypted-data-keys)
    - There MUST exist at least one encrypted data key in this list of encrypted data keys.
- [Encryption Context](#encryption-context.md)
    - The encryption context provided MAY be empty.

### Behaviors

The CMM Interface MUST support the following behaviors:

- [Get Encryption Materials](#get-encryption-materials)
- [Decrypt Materials](#decryption-request)

#### Get Encryption Materials

When the CMM gets an [encryption materials request](#encryption-materials-request), 
it returns [encryption materials](#data-structures.md#encryption-materials) appropriate for the request.  

The encryption materials returned MUST include the following:

- [Algorithm Suite](#algorithm-suite.md)
    - If the encryption materials request contains an algorithm suite, the encryption materials returned MUST contain the same algorithm suite.
    - If the encryption materials request does not contain an algorithm suite, the CMM determines the algorithm suite to be used.
- Plaintext Data Key
- [Encrypted Data Keys](#data-structures.md#encrypted-data-keys)
    - Every encrypted data key in this list MUST correspond to the above plaintext data key. 
- [Encryption Context](#data-structures.md#encryption-context)
    - This encryption context returned MUST be the same encryption context obtained from the encryption materials request. 
    - The CMM MUST NOT modify any existing key-value pairs in the encryption context. 
    - The CMM MAY add additional key-value pairs to the encryption context.   

The encryption materials returned MAY include the following:

- [Keyring Trace](#data-structures.md#keyring-trace)

If the algorithm suite contains a [signing algorithm](#algorithm-suites.md#signature-algorithm): 

- The CMM MUST generate a [signing key](#data-structures.md#signing-key).  

The CMM MUST verify that the encryption materials returned are valid.

- The encryption materials returned MUST follow the specification at [data structures/encryption-materials](#data-structures.md#encryption-materials).
- The value of the plaintext data key MUST be non-NULL. 
- The encrypted data keys list MUST contain at least one encrypted data key. 
- If the algorithm suite contains a signing algorithm, the encryption materials returned MUST include the generated signing key.

#### Decrypt Materials

The CMM obtains the [decrypted materials](#data-structures.md#decryption-materials), 
upon receiving a [decryption materials request](#decrypt-materials-request).

The decryption materials returned MUST include the following:

- Plaintext Data Key
- [Encryption Context](#data-structures.md#encryption-context)
   - This encryption context returned MUST be the same encryption context obtained from the decrypt materials request. 
   - The CMM MUST NOT modify any existing key-value pairs in the encryption context. 
   - The CMM MAY add additional key-value pairs to the encryption context.
- [Algorithm Suite](#algorithm-suite.md)
  - This algorithm suite returned MUST be the same algorithm suite obtained from the decrypt materials request.

The decryption materials returned MAY include the following:

- [Keyring Trace](#data-structures.md#keyring-trace)

If the algorithm suite obtained from the decryption request contains a [signing algorithm](#algorithm-suites.md#signature-algorithm), 
the decryption materials MUST include the [signature verification key](#data-structures.md#verification-key).   

The CMM MUST verify that the decryption materials returned are valid.  

- The decryption materials returned MUST follow the specification at [data structures/decryption-materials](#data-structures.md#decryption-materials).
- The value of the plaintext data key MUST be non-NULL.
- The plaintext data key returned MUST correspond with at least one of the encrypted data keys. 
    - The is typically done by constructing a CMM that uses keyrings/MKs.

## Customization

The CMM is an ideal point for customization and extension.  

Example scenarios include: 
- Interacting with other CMMs
- Using [Keyring(s)](#keyring-interface.md)
- Modifying the encryption context
- Managing the signing/verification keys
- Data key Caching 
- Providing support for policy enforcement 