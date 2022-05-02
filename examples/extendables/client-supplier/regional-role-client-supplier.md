[//]: # "Copyright Amazon.com Inc. or its affiliates. All Rights Reserved."
[//]: # "SPDX-License-Identifier: CC-BY-SA-4.0"

# Regional Role Client Supplier

Implementations of this MUST follow the rules defined in
[Example Extendables](../../../extendable.md).

## Implementations

- [Net](https://github.com/aws/aws-encryption-sdk-dafny/blob/develop/aws-encryption-sdk-net/Examples/ClientSupplier/RegionalRoleClientSupplier.cs)

## Definitions

### Conventions used in this document

The key words
"MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT",
"SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL"
in this document are to be interpreted as described in
[RFC 2119](https://tools.ietf.org/html/rfc2119).

## Regional Role Client Supplier Class

### Header

```c#
/// <summary>
///     Demonstrates implementing a Custom Client Supplier.
///     This Client Supplier will create KMS Clients with different IAM roles,
///     depending on the Region passed.
/// </summary>
```

### Class

```c#
// When implementing a Custom Client Supplier ALWAYS extend the Base class,
// not the interface.
public class RegionalRoleClientSupplier : ClientSupplierBase
{
    /// <summary>
    ///     Maps a Region to the Arn of the IAM Role the client supplier will
    ///     use when supplying a client.
    /// </summary>
    private static Dictionary<string, string> _regionIAMRoleMap;

    /// <summary>
    ///     Amazon Security Token Service, or STS, allows customers to fetch
    ///     temporary credentials.
    /// </summary>
    private static IAmazonSecurityTokenService _stsClient;

    public RegionalRoleClientSupplier()
    {
        _regionIAMRoleMap = GetRegionIAMRoleMap();
        _stsClient = new AmazonSecurityTokenServiceClient();
    }

    /// <summary>
    ///     This is the meat of a Client Supplier.
    ///     Whenever the AWS Encryption SDK needs to create a KMS client,
    ///     it will call <c>GetClient</c> for the regions in which it needs to call
    ///     KMS.
    ///     In this example, we utilize a Dictionary
    ///     to map regions to particular IAM Roles.
    ///     We use Amazon Security Token Service to fetch temporary credentials,
    ///     and then provision a Key Management Service (KMS) Client
    ///     with those credentials and the input region.
    /// </summary>
    /// <param name="input"><c>GetClientInput</c> is just the region</param>
    /// <returns>A KMS Client</returns>
    /// <exception cref="MissingRegionException">If the Region requested is missing from the RegionIAMRole Map</exception>
    /// <exception cref="AssumeRoleException">If the Assume Role call fails</exception>
    protected override IAmazonKeyManagementService _GetClient(GetClientInput input)
    {
        // Check our RegionIAMRole map for the provided region.
        // If it is missing, throw a Missing Region Exception.
        if (!_regionIAMRoleMap.ContainsKey(input.Region)) throw new MissingRegionException(input.Region);

        // Otherwise, call Amazon STS to assume the role.
        var iamArn = _regionIAMRoleMap[input.Region];
        var task = _stsClient.AssumeRoleAsync(new AssumeRoleRequest
        {
            RoleArn = iamArn,
            DurationSeconds = 900, // 15 minutes is the minimum value
            RoleSessionName = "ESDK-NET-Custom-Client-Example"
        });
        AssumeRoleResponse response;
        // Await the async response
        try
        {
            response = task.Result;
        }
        catch (Exception e)
        {
            throw new AssumeRoleException(input.Region, iamArn, e);
        }

        // Return a KMS Client with the credentials from STS and the Region.
        return new AmazonKeyManagementServiceClient(
            response.Credentials,
            RegionEndpoint.GetBySystemName(input.Region));
    }
}
```

### Custom Exceptions

These exceptions MUST extend `AwsCryptographicMaterialProvidersBaseException`.

#### Missing Region Exception

```c#
// Custom Exceptions SHOULD extend from the Library's Base Exception.
// This is a quirk of using Dafny to generate the Encryption SDK.
// The Encryption SDK will handle dotnet's System.Exception,
// but the exception message will be altered.
// By extending from the Library's Base Exception,
// you can ensure the exception's message will be as intended.
public class MissingRegionException : AwsCryptographicMaterialProvidersBaseException
{
    public MissingRegionException(string region) : base(
        $"Region {region} is not supported by this client supplier")
    {
    }
}
```

#### Assume Role Exception

```c#
public class AssumeRoleException : AwsCryptographicMaterialProvidersBaseException
{
    public AssumeRoleException(string region, string roleArn, Exception e) : base(
        $"Attempt to assume Role Arn {roleArn} for Region {region}" +
        $" encountered unexpected: {e.GetType()}: \"{e.Message}\"")
    {
        // At this time, the Encryption SDK only retains exception messages,
        // and not the entire stack trace.
        // As such, it is helpful to manually log the exceptions
        // (ideally, a logging framework would be used, instead of console).
        Console.Out.Write(e);
    }
}
```

## Client Supplier Example

Implementations of this example MUST follow the rules defined in
[Example Templates](../../../examples.md#example-templates).

### Header

```c#
/// Demonstrates using a Custom Client Supplier.
/// See <c>RegionalRoleClientSupplier.cs</c> for the details of implementing a
/// custom client supplier.
/// This example uses an <c>AwsKmsMrkDiscoveryMultiKeyring</c>, but all
/// the AWS Multi Keyrings take Client Suppliers.
```

### Summary

```c#
/// Demonstrates using a Custom Client Supplier.
```

### Inputs

- **plaintext** :
  Plaintext to encrypt
- **keyArn** :
  KMS Key Arn to encrypt/decrypt data with
- **accountIds** :
  List of trusted AWS Account Ids
- **regions** :
  List of AWS Regions trusted AWS Accounts operate in

### Steps

1. Generate or load a ciphertext encrypted by the KMS Key.

```c#
// Instantiate the Material Providers and the AWS Encryption SDK
var materialProviders =
    AwsCryptographicMaterialProvidersFactory.CreateDefaultAwsCryptographicMaterialProviders();
var encryptionSdk = AwsEncryptionSdkFactory.CreateDefaultAwsEncryptionSdk();

// To focus on Client Suppliers, we will rely on a helper method
// to create the encrypted message (ciphertext).
Dictionary<string, string> encryptionContext;
MemoryStream ciphertext;
(encryptionContext, ciphertext) = EncryptMessageWithKMSKey(
    plaintext, keyArn, materialProviders, encryptionSdk);
```

2. Create a KMS Multi Keyring with the `RegionalRoleClientSupplier`

```c#
// Now create a Discovery keyring to use for decryption.
// We are passing in our Custom Client Supplier.
var createDecryptKeyringInput = new CreateAwsKmsMrkDiscoveryMultiKeyringInput
{
    ClientSupplier = new RegionalRoleClientSupplier(),
    Regions = regions,
    DiscoveryFilter = new DiscoveryFilter()
    {
        AccountIds = accountIds,
        Partition = "aws"
    }
};

// This is a Multi Keyring composed of MRK Discovery Keyrings.
// All the keyrings have the same Discovery Filter.
// Each keyring has its own KMS Client, which is provisioned by the Custom Client Supplier.
var multiKeyring = materialProviders.CreateAwsKmsMrkDiscoveryMultiKeyring(createDecryptKeyringInput);
```

3. Decrypt the ciphertext with created KMS Multi Keyring

```c#
var decryptInput = new DecryptInput
{
    Ciphertext = ciphertext,
    Keyring = multiKeyring
};
var decryptOutput = encryptionSdk.Decrypt(decryptInput);
```

4. Verify the encryption context (MAY be done with a helper method)

```c#
VerifyEncryptionContext(decryptOutput, encryptionContext);
```

5. Verify the decrypted plaintext is the same as the original (MAY be done with a helper method)

```c#
VerifyDecryptedIsPlaintext(decryptOutput, plaintext);
```

6. Test the Missing Region Exception

```c#
// Demonstrate catching a custom exception.
var createMultiFailed = false;
createDecryptKeyringInput.Regions = new List<string>() {RegionEndpoint.CNNorth1.SystemName};
try { materialProviders.CreateAwsKmsMrkDiscoveryMultiKeyring(createDecryptKeyringInput); }
// Note that the exception returned is NOT a `MissingRegionException`
catch (MissingRegionException) { throw; }
// But is cast down to an `AwsCryptographicMaterialProvidersBaseException`.
catch (AwsCryptographicMaterialProvidersBaseException exception)
{
    // However, the message is as expected.
    Assert.Equal(
        $"Region {RegionEndpoint.CNNorth1.SystemName} is not supported by this client supplier",
        exception.Message);
    createMultiFailed = true;
}
finally { Assert.True(createMultiFailed); }
```
