[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Encryption Context Vectors

## Version

1.0.0

## Summary

This is a description of the standard encryption contexts to test.

## Reference-level Explanation

### Standard Encryption Contexts Constraints

MUST have an empty map.
The number of the items in the empty map MUST equal 0.
MUST have a small map.
The number of the items in the small map MUST be between 1 and 10.
MUST have a large map.
The number of the items in the large map MUST be greater than 10.
MUST have multibyte UTF8 characters in both the key and value.
MUST have multibyte non-BMP characters in both the key and value.