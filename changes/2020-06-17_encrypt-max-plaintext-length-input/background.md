[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# TITLE GOES HERE

## Affected Features

This serves as a reference of all features that this change affects.

| Feature |
| ------- |


## Affected Specifications

This serves as a reference of all specification documents that this change affects.

| Specification |
| ------------- |


## Affected Implementations

This serves as a reference for all implementations that this change affects.

| Language   | Repository                                                                            |
| ---------- | ------------------------------------------------------------------------------------- |
| Python     | [aws-encryption-sdk-c](https://github.com/aws/aws-encryption-sdk-python)              |
| Java       | [aws-encryption-sdk-javascript](https://github.com/aws/aws-encryption-sdk-java)       |
| C          | [aws-encryption-sdk-c](https://github.com/aws/aws-encryption-sdk-c)                   |
| Javascript | [aws-encryption-sdk-javascript](https://github.com/aws/aws-encryption-sdk-javascript) |

## Definitions

Include any definitions of terms here.

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Summary

Short, 1-2 paragraph summary of this change.

## Out of Scope

What is this _not_?

## Motivation

Why did we do this? What problems did it solve?

## Drawbacks

What problems were introduced by this change, or what gaps in the original problems does
it leave open?

## Security Implications

Are there any security implications introduced by this change?

## Operational Implications

Are there any operational implications introduced by this change?

## Guide-level Explanation

Explain the change as it should be implemented as if you were teaching it to another developer
who wants to use the changed features. This generally includes:

- Introducing concepts.
- Explaining the change in terms of examples.
- Explaining how developers should think about the changed features.
- Explain any data structures that the change requires.
- If applicable, describe the differences between teaching this to new users and existing users.

## Reference-level Explanation

Explain the design in sufficient detail that a developer
already familiar with a given implementation
could implement this change without referencing other implementations.
This should include:

- Any new features.
- Any interactions with existing features.
- Any changes that this makes to interactions between other, related, features.
- Required API shapes.

    - note: specifically not exact names for any given language

- Edge cases to be aware of that might influence implementation-specific design.

    - Ex: Cryptographic materials managers should return raw keys rather than constructs
      that use those keys to simplify the interface between a caching CMM and a cache. Those
      raw keys must use a standard format to ensure that an off-box cache can be shared by
      multiple clients across implementations.
