[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Branch Key Storage Changes for Mutating Branch Keys

# Definitions

## All items of a Branch Key

"All items of a Branch Key" is all the items
persisted in the Key Store with the same Branch Key ID;
these will be one or more DECRYPT_ONLY versions,
the ACTIVE version, and the Beacon Key.

In this document,
the result of the kms:GenerateDataKeyWithoutPlaintext of a Branch Key Version
is the "Branch Key Version's Cryptographic Material".

All the results of the kms:GenerateDataKeyWithoutPlaintext
of all items of a Branch Key
are the "Branch Key's Cryptographic Materials".

## MPL Consumer

An "MPL Consumer" is a library, service, or other application
that uses the AWS Cryptographic Material Providers Library (MPL)
to manage cryptographic materials.
An "MPL Consumer" may or may not be using an AWS Crypto Tools product,
such as the AWS Encryption SDK or the AWS Database Encryption SDK.

## Conventions used in this document

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

# Background

The [branch key store](../../framework/branch-key-store.md)
persists Branch Keys and their metadata;
the [Key Storage Interface](../../framework/key-store/key-storage.md)
is the interface for persisting this data.

The Interface does yet specify how to safely change
properties of these Branch Key items.

This change adds new Operations to the interface,
which facilitate changing the
properties of all items of a Branch Key.

These new operations are constructed with _Optimistic Locks_,
ensuring that modifications do not accidentally erase data.

Additionally,
they facilitate the creation, maintenance, and deletion
of items that are used to ensure a change to a Branch Key
is consistently applied to all items of that Branch Key.

# Design Questions

These are not answered,
as the Mutations Background document addresses
these questions.

# Changes

## New Structures

The following structures are introduced to the Key Storage Interface:

### EncryptedHierarchicalKeys

A List of
[EncryptedHierarchicalKey](../../framework/key-store/key-storage.md#encryptedhierarchicalkey).

### MutationCommitment

A structure holding information on
an in-flight Mutation of a Branch Key
that is never updated in-flight.

The members are:

- `Identifier`: a string, The Branch Key (ID) under Mutation
- `CreateTime`: a string, The ISO 8061 UTC Timestamp of when the Mutation was started
- `UUID`: a string, A unique identifier for the Mutation
- `Original`: a binary blob, A commitment of the original mutable properties of the Branch Key
- `Terminal`: a binary blob, A commitment of the terminal mutable properties of the Branch Key
- `Input`: a binary blob, A Description of the input to initialize a Mutation
- `CiphertextBlob`: a binary blob, which MAY be used to protect the Mutation Commitment

### MutationIndex

A structure holding information on
an in-flight Mutation of a Branch Key
that is regularly changed in-flight.

The members are:

- `Identifier`: a string, The Branch Key (ID) under Mutation
- `CreateTime`: a string, The ISO 8061 UTC Timestamp of when the Mutation was started
- `UUID`: a string, A unique identifier for the Mutation
- `PageIndex`: a binary blob, Indirectly describes which items of the Branch Key have already been Mutated
- `CiphertextBlob`: a binary blob, which MAY be used to protect the Mutation Index

### OverWriteMutationIndex

A structure, much like
[OverWriteEncryptedHierarchicalKey](../../framework/key-store/key-storage.md#overwriteencryptedhierarchicalkey),
that affords a conditioned update to the Mutation Index.

The members are:

- `Index`: The new Mutation Index
- `Old`: The last read Mutation Index

## New Operations

The following new Operations are added:

### GetItemsForInitializeMutation

Retrieves the items necessary to initialize a Mutation,
while checking for any in-flight Mutations.

### WriteInitializeMutation

Atomically updates the Active Items
of a Branch Key along with
the Mutation Commitment and Mutation Index.

### WriteAtomicMutation

Atomically updates all the Items of a Branch Key.

#### QueryForVersions

Query Storage for a page of version (decrypt only) items of a Branch Key.

### WriteMutatedVersions

Atomically updates a page of version (decrypt only)
items while maintaining the Mutation Commitment and Mutation Index.

### GetMutation

Check for Mutation Commitment on a Branch Key ID.
If one exists, returns the Mutation Commitment.
Otherwise, returns nothing.

### DeleteMutation

Deletes an existing Mutation Commitment & Index.

#### WriteMutationIndex

Creates a Mutation Index, conditioned on the Mutation Commitment.
