# Default Cryptographic Materials Manager

## Version

0.1.0-preview

## Implementations

- [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/include/aws/cryptosdk/default_cmm.h)
- [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/materials_managers/default.py)
- [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/DefaultCryptoMaterialsManager.java)
- [NodeJS](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management-node/src/node_cryptographic_materials_manager.ts)
- [Browser JS](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/material-management-browser/src/browser_cryptographic_materials_manager.ts)

## Overview

The Default Cryptographic Materials Manager (CMM) is a built-in implementation of the [CMM interface](#cmm-interface.md) provided by the AWS Encryption SDK.  
It is used by default to wrap the [key provider](#key-provider.md).  

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" 
in this document are to be interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

## Behaviors

### Get Encryption Materials

- If the encryption materials request does not contain an algorithm suite, 
the algorithm suite with algorithm suite ID [03 78 (hex)](algorithm-suites.md#supported-algorithm-suites) 
MUST be added as the algorithm suite in the encryption materials returned.  
- If the encryption materials request does contain an algorithm suite, the encryption materials returned MUST contain the same algorithm suite.

If the algorithm suite contains a [signing algorithm](#algorithm-suites.md#signature-algorithm), the default CMM MUST:

- Generate a [signing key](#structures.md#signing-key)
- Add the following key-value pair to the [encryption context](#structures.md#encryption-context): 
    - The key MUST be the reserved name, `aws-crypto-public-key`. 
    - The value MUST be the base64-encoded public verification key.

On each call to Get Encryption Materials, the default CMM MUST make a call to the key provider's [On Encrypt](#key-provider.md#on-encrypt) function.  

The default CMM MUST obtain the following from the response:

- Plaintext Data Key
- [Encrypted Data Keys](#structures.md#encrypted-data-keys)

The default CMM MAY obtain the following from the response:

- [Keyring Trace](#structures.md#keyring-trace)

The values obtained above MUST be included in the encryption materials returned.  

### Decrypt Materials

If the algorithm suite contains a [signing algorithm](#algorithm-suites.md#signature-algorithm), 
the default CMM MUST remove the verification key from the encryption context.  
  
On each call to Decrypt Materials, the default CMM MUST make a call to the key provider's [On Decrypt](#key-provider.md#on-decrypt) function.  

The default CMM MUST obtain the following from the response:

- Plaintext Data Key 

The default CMM MAY obtain the following from the response:

- [Keyring Trace](#structures.md#keyring-trace)

The values obtained above MUST be included in the decrypt materials returned.  
