[//]: # (Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.)
[//]: # (SPDX-License-Identifier: CC-BY-SA-4.0)

# Decrypt

## Version

0.1.0-preview

## Implementations

-   [C](https://github.com/aws/aws-encryption-sdk-c/blob/master/source/session_decrypt.c)
-   [Java](https://github.com/aws/aws-encryption-sdk-java/blob/master/src/main/java/com/amazonaws/encryptionsdk/internal/DecryptionHandler.java)
-   [JSNode](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/decrypt-node/src/decrypt.ts)
-   [Browser JS](https://github.com/awslabs/aws-encryption-sdk-javascript/blob/master/modules/decrypt-browser/src/decrypt.ts)
-   [Python](https://github.com/aws/aws-encryption-sdk-python/blob/master/src/aws_encryption_sdk/streaming_client.py)

## Overview

This document describes the behavior of decrypting the encrypted message previously received from an encrypt call to the AWS Encryption SDK.
The AWS Encryption SDK provides a client to decrypt the inputted encrypted message, and returns as the output the plaintext.

## Definitions

### Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in [RFC2119](https://tools.ietf.org/html/rfc2119).

## Input

The client MUST require the following as inputs to this behavior:

-   [Encrypted Message](#encrypted-message)

The client MUST require exactly one of the following type of inputs:

-   [Cryptographic Materials Manager (CMM)](../framework/cmm-interface.md)
-   [Keyring](../framework/keyring-interface.md)

The client SHOULD also provide a way to limit memory usage, such that you can decrypt an arbitrary long ciphertext using limited memory.

### Encrypted Message 

The encrypted message to decrypt.  
The encrypted message inputted MUST be in the [message format](../data-format/message.md) specified by the AWS Encryption SDK.  
The encrypted message contains the list of [encrypted data keys](../data-format/message-header.md#encrypted-data-keys), 
[encryption context](../data-format/message-header.md#aad), if provided during encryption, 
[encrypted content](../data-format/message-body.md#encrypted-content) and 
[algorithm suite ID](../data-format/message-header.md#algorithm-suite-id) among other metadata.  
Each key in the encrypted data key list is an encrypted version of the single plaintext data key that was used to encrypt the plaintext.  
The encryption context is the additional authenticated data that was used during encryption.   
The algorithm suite ID refers to the algorithm suite used to encrypt the message and is required to decrypt the encrypted message.   

### Cryptographic Materials Manager

A CMM that implements the [CMM interface](../framework/cmm-interface.md).  

This CMM MUST obtain the [decryption materials](../framework/structures.md#decryption-materials) required for decryption.  

### Keyring

A Keyring that implements the [keyring interface](../framework/keyring-interface.md).  

If the Keyring is provided as the input, the client MUST construct a [default CMM](../framework/default-cmm.md) that uses this keyring, 
to obtain the [decryption materials](../framework/structures.md#decryption-materials) that is required for decryption.  

This default CMM MUST obtain the decryption materials required for decryption.   

## Output

The client MUST return as output to this behavior:

-   [Plaintext](#plaintext)

### Plaintext

The decrypted data.

To obtain the decrypted data, a set of valid decryption materials is required.

This behavior MUST obtain this set of [decryption materials](../framework/structures.md#decryption-materials), 
by calling [Decrypt Materials](../framework/cmm-interface.md#decrypt-materials) on a [CMM](../framework/cmm-interface.md).

The CMM used MUST be the input CMM, if supplied.
If a CMM is not supplied as the input, the decrypt behavior MUST construct a [default CMM](../framework/default-cmm.md) 
from the [keyring](../framework/keyring-interface.md) inputted.

The call to CMM's [Decrypt Materials](../framework/cmm-interface.md#decrypt-materials) behavior MUST include as the input the 
[encryption context](../data-format/message-header.md#aad), if provided, the [encrypted data keys](../data-format/message-header.md#encrypted-data-keys) and the 
[algorithm suite ID](../data-format/message-header.md#algorithm-suite-id), obtained from parsing the message header of the encrypted message inputted.

The decryption materials returned by the call to the CMM's Decrypt Materials behaviour MUST contain a valid 
[plaintext data key](../framework/structures.md#plaintext-data-key-1),
[algorithm suite](../framework/algorithm-suites.md) and an
[encryption context](../framework/structures.md#encryption-context), if an encryption context was used during encryption.    
Note: This encryption context MUST be the same encryption context that was used during encryption otherwise the decrypt operation will fail.   

The decrypt behavior MUST then use this plaintext data key, algorithm suite and encryption context, if included, to decrypt the encrypted content 
and obtain the plaintext to be returned. The [encrypted content](../data-format/message-body.md#encrypted-content) to be decrypted is obtained by parsing the 
[message body](../data-format/message-body.md) of the encrypted message inputted.   

Note: If the message is framed, the encrypted content to decrypt is stored across multiple frames.   
If the message is non framed, the encrypted content to decrypt is stored as a single blob.  

Decrypt MUST use the encryption algorithm obtained from the algorithm suite.  
The cipher key used for decryption is the derived key outputted by the [KDF algorithm](../framework/algorithm-suites.md#key-derivation-algorithm)
specified by the algorithm suite.   
The input to the KDF algorithm is the plaintext data key.  

The AAD used in decryption is the [Message Body AAD](../data-format/message-body-aad.md), constructed as follows:

- Message ID: This value is the same as the message ID in the parsed message header.
- Body AAD Content: This value depends on whether the encrypted content being decrypted is within a [regular frame](../data-format/message-body.md#regular-frame) , 
  a [final frame](../data-format/message-body.md#final-frame) or is [non framed](../data-format/message-body.md#non-framed-data). 
  Refer to [Message Body AAD](../data-format/message-body-aad.md) specification for more information.
- Sequence Number: This value is the [sequence number](../data-format/message-body.md#sequence-number) of the frame being decrypted, if the message contains framed data. 
  If the message contains non framed data, then this value is 1.
- Content Length: TODO

If the algorithm suite has a signature algorithm, decrypt MUST verify the message footer using the specified signature algorithm, 
by using the verification key obtained from the decryption materials.

## Security Considerations

[TODO]

## Apendix 

### Streaming

[TODO: Implementations SHOULD support working with a finite amount of working memory for arbitrarly large plaintext. 
If size is not known, how do we set the bounds?]
