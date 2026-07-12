

const calculateShipping = async (isResidential,zipCode) => {

    //burada UPS e axios ile istek atılacak, isResidential,zipCode bilgileri gelecek ve ona göre fiyat vetahminisüreverisi dönderecek

    let url = "https://wwwcie.ups.com/api/shipments/v1/transittimes"

    let body = {
    originCountryCode: "DE",
    originStateProvince: "",
    originCityName: "",
    originTownName: "",
    originPostalCode: "10703",
    destinationCountryCode: "US",
    destinationStateProvince: "NH",
    destinationCityName: "MANCHESTER",
    destinationTownName: "",
    destinationPostalCode: "03104",
    weight: "10.5",
    weightUnitOfMeasure: "LBS",
    shipmentContentsValue: "10.5",
    shipmentContentsCurrencyCode: "USD",
    billType: "03",
    shipDate: "2019-05-01",
    shipTime: "",
    residentialIndicator: "",
    avvFlag: true,
    numberOfPackages: "1"
}



}


module.exports = {calculateShipping}