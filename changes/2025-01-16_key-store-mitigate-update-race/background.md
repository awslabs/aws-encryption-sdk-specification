[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Mitigate Update Race in Branch Key Store

# Definitions

## MPL

Material Providers Library

## Conventions used in this document

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD",
"SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be
interpreted as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).

# Background

The [branch key store](../../framework/branch-key-store.md) needs to persist branch key versions.
As of 22nd July, 2025 DynamoDB is the only option of storage for branch key storage.

The behavior of the `VersionKey` operation
leaves open a possibility for a normally benign overwrite
of the cipher-text of a Branch Key,
should two or more agents a Version a Branch Key simultaneously.

This change mitigates this.

## Detailed Explanation

The Key Store's `VersionKey` operation does NOT,
at this time,
validate that the ACTIVE item has NOT been modified
since it read the item.

This allows the Key Store's `VersionKey` operation
to race itself.

`VersionKey`'s self-race is benign;
the only consequence is an additional
but unneeded versions of the Branch Key.

However,
Crypto Tools or it's customers may write logic
that modify Branch Key items in other ways.

Such modifications,
if overwritten due to a race,
may break customers or methods Crypto Tools
introduces to modify Branch Keys.

Thus,
Crypto Tools should refactor the Storage interface
to mitigate the unintended overwrite.

## Optimistic Lock

We will mitigate this via an Optimistic Lock on the cipher-text.

All writes to ACTIVE,
except those by `CreateKey`,
would include a condition expression of
`attribute_exists(branch-key-id) AND enc = <old-cipher-text-value>`,
as [expressed in DynamoDB Syntax](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html).

`enc` gives an assertion on the state of:

- any custom encryption context
- the creation date
- the hierarchy-version
- the Logical Key Store Name

`enc` contains the Auth Tag from
the AES-GCM operation executed by KMS.

Thus, by asserting `enc` has not changed,
the Key Store asserts that nothing has changed!

Since this _Optimistic Lock_ is only
applied AFTER the `enc` value has
been validated by KMS
during the Version routine,
the Key Store KNOWS `enc` is valid.

If `enc` has been changed,
the write will fail with an error detailing the condition check failure.

# Changes

The change is to use an Optimistic Lock
on the old cipher-text value.

This refactors:

- The [Branch Key Store's VersionKey](../../framework/branch-key-store.md#versionkey)

These refactors are to use the old Active's cipher-text
as the optimistic lock.
