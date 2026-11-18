[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Un-modeled Branch Key Context Key Values

# Definitions/Background

See [background](./background.md) for an introduction to Hierarchy Version 2 (HV-2).

## Problem

The issue at hand is what to do about un-prefixed context of a Branch Key.

These are any members of the Branch Key's Context whose key is not prefixed by `aws-crypto-ec:` OR not another reserved Branch Key Context Key Name, such as `kms-arn` or `hierarchy-version`.
Such Key-Value pairs were NOT added to a Branch Key Item by a Crypto Tools product.
But they could have been added by an AWS Cryptographic Material Providers Library (MPL) Consumer manually.
As long as this is done properly, the AWS KMS Hierarchical Keyring will use these manually modified Branch Keys.

# Observations

### HV-2 Obs 1: Digest makes out-of-library changes more difficult

Hierarchy Version 2 makes out-of-library changes more difficult, as the Branch Key Context is not protected by KMS Encryption Context, but by a digest on a canonicalization of the Branch Key Context.
Thus, changing an HV-2 Branch Key can only be done by using the library or a specification compliant implementation.

### HV-2 Obs 2: No prefix to KMS removes an incentive

The only motivation for such out-of-library modifications was for customers who needed to call KMS without the `aws-crypto-ec:` prefix, such that they can call KMS with the same Encryption Context as their other integrations.
(For example, the KMS Keyring, as compared the Hierarchical Keyring.)
Hierarchy Version 2 does not call KMS with this prefix; thus, this motivation is no longer valid.

# Options

## Option 1: Entirely Prevent this in HV-2

Hierarchy Version 2 addresses a strong motivation for MPL Consumers to remove the prefix; while there might be other motivations (for example, Global Secondary Index (GSI) in Amazon DynamoDB), Crypto Tools is unaware of them.
Thus, it seems reasonable for Hierarchy Version 2 to have a much stricter data model than Hierarchy Version 1.
This data model would ensure that every Branch Key Context Key Name of a Branch Key Item is either:

- a reserved key name
- prefixed with `aws-crypto-ec:`

However, when/if a feature to mutate the Branch Key scheme ever exists then this means that Hierarchy Version 1 Branch Keys that were modified outside of the library cannot be "Mutated" to Hierarchy Version 2 unless the modification is reverted.

Risk:
Crypto Tools (CT) knows that at least one CT customer is pursuing out-of-library changes. If CT goes with this option, CT SHOULD clearly document:

1. HV-2 has a stricter data model
2. In general, CT products do not support out-of-library behavior

Despite the risk, the author considers this Option the best path forward, and will ensure its implementation unless someone objects.

## Option 2: Prevent but preserve

If a feature to mutate the Branch Key schema ever exists, mutations to HV-2 could preserve the un-prefixed context, if they were present on the HV-1 Branch Key.
However, there is no way for MPL Consumers to modify this un-prefixed context, as the relatively simple `kms:ReEncrypt` pattern to make the out-of-library change will not update the digest in HV-2, and therefore Branch Key modified this way will be considered by the library to be invalid.

The way HV-2 puts Encryption Context in digest also advocates for not maintaining an out-of-library change.
As such, CT should implement Option 1.

## Option 3: Reverse the prefix

Crypto Tools could "flip" the prefix; prefixing the reserved context instead of the Encryption Context. However, this is a breaking change, as two members of the reserved context are the partition key (branch-key-id) and the sort key (type) of the DynamoDB table.
Thus, it would have to be an optional behavior, and it would be challenging to operate in a mixed state, as that would likely involve two DynamoDB indexes (either via two DynamoDB tables or one with table a GSI).

If Crypto Tools' customers asked for no-prefixing in the DynamoDB, or a reversing of the prefix, Crypto Tools could implement a different feature for that (or the customers could write a custom keyring; though those are currently difficult with DB-ESDK because of a quite breaking change in the keyring interface).
Thus, for now, Crypto Tools should not pick up reversing the prefix; changing the data model was correctly labeled out of scope in the beginning and we should stick to that.

# Conclusion

The team decided to go with option 1.
