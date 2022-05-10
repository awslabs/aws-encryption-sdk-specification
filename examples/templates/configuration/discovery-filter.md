[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Discovery Filter example

Implementations of this example MUST follow the rules defined in
[Example Templates](../../../examples.md#example-templates).

## Implementations

- [JavaScript Node](https://github.com/aws/aws-encryption-sdk-javascript/blob/master/modules/example-node/src/kms_filtered_discovery.ts)
- [NET](https://github.com/aws/aws-encryption-sdk-dafny/blob/mainline/aws-encryption-sdk-net/Examples/DiscoveryFilterExample.cs)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Header

```c#
/// Discovery Filters are used to restrict Discovery Keyrings
/// to trusted AWS Accounts.
/// The Accounts are specified by their Account Ids
/// and the partition they are in.
///
/// It's always a best practice to specify your wrapping keys explicitly.
/// This practice assures that you only use the keys that you intend.
/// It also improves performance by preventing you from
/// inadvertently using keys in a different AWS account or Region,
/// or attempting to decrypt with keys that you don't have permission to use.
///
/// However, when decrypting with AWS KMS keyrings,
/// you are not required to specify wrapping keys.
/// The AWS Encryption SDK can get the key identifier
/// from the metadata of the encrypted data key.
///
/// When specifying AWS KMS wrapping keys for decrypting is impractical
/// (such as when encrypting using AWS KMS Aliases),
/// you can use discovery keyrings.
///
/// When you can not specify your wrapping keys explicitly,
/// using a Discovery Filter is a best practice.
///
/// Particularly if an application is decrypting messages from multiple sources,
/// adding trusted AWS accounts to the discovery filter allows it to
/// protect itself from decrypting messages from untrusted sources.
```

## Summary

```c#
/// Demonstrate using Discovery Filters.
```

## Inputs

- **plaintext** :
  Plaintext that is/will be encrypted
  
- **trustedAccountIds** :
  List of AWS Account Ids that are trusted.
  
- **awsPartition** :
  AWS Partition that contains all the members of "trustedAccountIds".
  
## Steps

1. Instantiate the Material Providers and Encryption SDK

```C#
// Instantiate the Encryption SDK such that it limits the number of
// Encrypted Data Keys a ciphertext may contain.
// Discovery Keyrings are an excellent tool
// for handling encrypted messages from multiple sources.
// Limiting the number of encrypted data keys is a best practice,
// particularly when decrypting messages from multiple sources.
// See the LimitEncryptedDataKeysExample for details.
```

2. Create a Discovery Keyring with a Discovery Filter
```c#
// We create a Discovery keyring to use for decryption.
// We'll add a discovery filter so that we limit the set of Encrypted Data Keys
// we are willing to decrypt to only ones created by KMS keys from
// trusted accounts.
```

3. Retrieve or create an encrypted message to decrypt.

4. Decrypt the encrypted data.

5. Verify the encryption context

6. Verify the decrypted plaintext is the original plaintext

7. Create a discovery filter that excludes the encrypted data key

8. Validate the excluding discovery filter fails to decrypt the ciphertext
