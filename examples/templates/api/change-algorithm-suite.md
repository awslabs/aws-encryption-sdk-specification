[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Changing the algorithm suite example

Implementations of this example MUST follow the rules defined in
[Example Templates](../../../examples.md#example-templates).

## Implementations

- [Python (DEV)](https://github.com/aws/aws-encryption-sdk-python/blob/keyring/examples/src/onestep_unsigned.py)
- [Java (DEV)](https://github.com/aws/aws-encryption-sdk-java/blob/keyring/src/examples/java/com/amazonaws/crypto/examples/OneStepUnsigned.java)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Header

```
# This example shows how to specify an algorithm suite
# when using the one-step encrypt and decrypt APIs.
#
# In this example, we use an AWS KMS customer master key (CMK),
# but you can use other key management options with the AWS Encryption SDK.
# For examples that demonstrate how to use other key management configurations,
# see the ``keyring`` and ``master_key_provider`` directories.
#
# The default algorithm suite includes a message-level signature
# that protects you from an attacker who has *decrypt* but not *encrypt* capability
# for a wrapping key that you used when encrypting a message
# under multiple wrapping keys.
#
# However, if all of your readers and writers have the same permissions,
# then this additional protection does not always add value.
# This example shows you how to select another algorithm suite
# that has all of the other properties of the default suite
# but does not include a message-level signature.
```

## Summary

```
# Demonstrate requesting a specific algorithm suite through the one-step encrypt/decrypt APIs.
```

## Inputs

- **source plaintext** :
  Plaintext to encrypt
- **AWS KMS CMK** :
  The ARN of an AWS KMS CMK that protects data keys

## Steps

1. Define encryption context.

   ```
   # Prepare your encryption context.
   # Remember that your encryption context is NOT SECRET.
   # https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/concepts.html#encryption-context
   encryption_context = {
       "encryption": "context",
       "is not": "secret",
       "but adds": "useful metadata",
       "that can help you": "be confident that",
       "the data you are handling": "is what you think it is",
   }
   ```

1. Create keyring.

   ```
   # Create the keyring that determines how your data keys are protected.
   ```

1. Encrypt plaintext data.

   ```
   # Encrypt your plaintext data.
   #
   # Specifically request the AES_256_GCM_IV12_TAG16_HKDF_SHA256 algorithm suite.
   ```

1. Compare ciphertext to plaintext.

   ```
   # Demonstrate that the ciphertext and plaintext are different.
   ```

1. Decrypt encrypted data.

   ```
   # Decrypt your encrypted data using the same keyring you used on encrypt.
   #
   # You do not need to specify the encryption context on decrypt
   # because the header of the encrypted message includes the encryption context.
   #
   # You do not need to specify the algorithm suite on decrypt
   # because the header message includes the algorithm suite identifier.
   ```

1. Compare the decrypted plaintext and original plaintext.

   ```
   # Demonstrate that the decrypted plaintext is identical to the original plaintext.
   ```

1. Verify the encryption context.

   ```
   # Verify that the encryption context used in the decrypt operation includes
   # the encryption context that you specified when encrypting.
   # The AWS Encryption SDK can add pairs, so don't require an exact match.
   #
   # In production, always use a meaningful encryption context.
   ```
