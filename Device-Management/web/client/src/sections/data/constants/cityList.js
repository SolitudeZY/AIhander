let city = []
for (let i = 0; i < 6; i++) {
    let location = ''
    let cityName=''
    switch (i) {
        case 0:
            location='101240701'
            cityName='赣州'
            break;
        case 1:
            location='101240301'
            cityName='上饶'
            break;
        case 2:
            location='101240801'
            cityName='景德镇'
            break;
        case 3:
            location='101240201'
            cityName='九江'
            break;
        case 4:
            location='101241001'
            cityName='新余'
            break;
        case 5:
            location='101240601'
            cityName='吉安'
            break;
        default:
            break;
    }
    city.push({location,cityName,offline:10,strongWarning:10,weakWarning:10,normal:20})
}
export default city