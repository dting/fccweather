(function() {
  'use strict';

  var app = angular.module('weatherApp', []);

  app.controller('weatherController',
    function($scope, LocationService, WeatherService) {
      $scope.location = undefined;
      $scope.weather = undefined;

      LocationService.getCoordinates().then(function(coordinates) {
        LocationService.getGeocodeInfo(coordinates).then(function(location) {
          $scope.location = location;
        });
        WeatherService.getWeatherInfo(coordinates).success(function(res) {
          $scope.weather = res.scopeData;
        });
      }, function(err) {
        console.log(err);
      });

      $scope.toggleUnits = function() {
        if ($scope.weather) {
          WeatherService.toggleUnits($scope.weather.temp);
        }
      }
    });

  app.factory('LocationService', function($q, $http) {
    var geocoder = new google.maps.Geocoder();
    var locationComps = {
      locality: 'long_name',
      administrative_area_level_2: 'long_name',
      administrative_area_level_1: 'long_name'
    };

    function getCoordinates() {
      var deferred = $q.defer();
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(location) {
          deferred.resolve(location.coords);
        }, function(err) {
          if (err.code == err.PERMISSION_DENIED) {
            fallbackCoordinates().success(function(res) {
              deferred.resolve(res);
            });
          } else {
            deferred.reject(err)
          }
        });
      } else {
        fallbackCoordinates().success(function(res) {
          deferred.resolve(res);
        });
      }
      return deferred.promise;
    }

    function fallbackCoordinates() {
      return $http.get('https://freegeoip.net/json/');
    }

    function getGeocodeInfo(coordinates) {
      var deferred = $q.defer();
      var latlng = new google.maps.LatLng(
        coordinates.latitude, coordinates.longitude);
      geocoder.geocode({location: latlng}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          if (results[1]) {
            var location = {};
            results[1].address_components.forEach(function(component) {
              var addressType = component.types[0];
              if (locationComps[addressType]) {
                location[addressType] = component[locationComps[addressType]];
              }
            });
            deferred.resolve(location);
          } else {
            deferred.reject('Expected result not found: ' + results);
          }
        } else {
          deferred.reject('Geocoder failed due to: ' + status);
        }
      });
      return deferred.promise;
    }

    return {
      getCoordinates: getCoordinates,
      getGeocodeInfo: getGeocodeInfo
    };
  });

  app.factory('WeatherService', function($http) {
    function degToCompass(deg) {
      return DIR[(~~((deg / 22.5) + 0.5) % 16)];
    }

    function getUnits(country) {
      var imperialCountries = ['US', 'BS', 'BZ', 'KY', 'PW'];
      return imperialCountries.indexOf(country) === -1 ? 'metric' : 'imperial';
    }

    function toggleUnits(temp) {
      if (temp.units === 'F') {
        temp.units = 'C';
        temp.value = ((temp.value - 32) / 1.8).toFixed(2);
      } else {
        temp.units = 'F';
        temp.value = ((temp.value * 1.8) + 32).toFixed(2);
      }
    }

    function getWeatherInfo(coordinates) {
      return $http.get(weatherApiUrl, {
        params: {
          lat: coordinates.latitude,
          lon: coordinates.longitude,
          units: 'imperial'
        }
      }).success(function(data) {
        var weather = {};
        weather.temp = {value: data.main.temp, units: 'F'};
        weather.icon = data.weather[0].icon;
        if (getUnits(data.sys.country) !== 'imperial') {
          toggleUnits(weather.temp);
        }
        weather.description = DESCRIPTIONS[weather.icon];
        weather.wind = {
          speed: data.wind.speed + ' knots',
          direction: degToCompass(data.wind.deg)
        };
        data.scopeData = weather;
      });
    }

    var weatherApiUrl = 'http://api.openweathermap.org/data/2.5/weather';
    var DIR = [
      'N',
      'NNE',
      'NE',
      'ENE',
      'E',
      'ESE',
      'SE',
      'SSE',
      'S',
      'SSW',
      'SW',
      'WSW',
      'W',
      'WNW',
      'NW',
      'NNW'
    ];
    var DESCRIPTIONS = {
      '01d': {
        img: 'https://farm8.staticflickr.com/7559/16089993777_8f601d96e2_o.jpg',
        attr: 'https://www.flickr.com/photos/124329303@N08/',
        text: 'sky is clear',
      },
      '01n': {
        img: 'https://farm6.staticflickr.com/5604/15481101575_577b9380a3_o.jpg',
        attr: 'https://www.flickr.com/photos/124329303@N08/',
        text: 'sky is clear',
      },
      '02d': {
        img: 'https://farm9.staticflickr.com/8391/8476078161_59baaa9355_o.jpg',
        attr: 'https://www.flickr.com/photos/sdasmarchives/',
        text: 'few clouds',
      },
      '02n': {
        img: 'https://farm6.staticflickr.com/5465/17214759716_193465c7e1_k.jpg',
        attr: 'https://www.flickr.com/photos/ryanhallock/',
        text: 'few clouds',
      },
      '03d': {
        img: 'https://farm4.staticflickr.com/3890/18946819309_64478cf81d_h.jpg',
        attr: 'https://www.flickr.com/photos/michaelpardo/',
        text: 'scattered clouds',
      },
      '03n': {
        img: 'https://farm9.staticflickr.com/8711/17336854195_36630c69bf_k.jpg',
        attr: 'https://www.flickr.com/photos/jdamasio/',
        text: 'scattered clouds',
      },
      '04d': {
        img: 'https://farm9.staticflickr.com/8061/8231162693_a411f15c51_k.jpg',
        attr: 'https://www.flickr.com/photos/au_unistphotostream/',
        text: 'broken clouds',
      },
      '04n': {
        img: 'https://farm8.staticflickr.com/7681/16712423663_4a2ea5ce92_k.jpg',
        attr: 'https://www.flickr.com/photos/tigra-co/',
        text: 'broken clouds',
      },
      '09d': {
        img: 'https://farm9.staticflickr.com/8868/18430831370_2b7b070858_h.jpg',
        attr: 'https://www.flickr.com/photos/michaelpardo/',
        text: 'shower rain',
      },
      '09n': {
        img: 'https://farm8.staticflickr.com/7696/16895976370_6ae0428987_h.jpg',
        attr: 'https://www.flickr.com/photos/michaelpardo/',
        text: 'shower rain',
      },
      '10d': {
        img: 'https://farm2.staticflickr.com/1150/873273143_55c5fcac2f_o.jpg',
        attr: 'https://www.flickr.com/photos/henriquev/',
        text: 'rain',
      },
      '10n': {
        img: 'https://farm4.staticflickr.com/3884/14436522280_0096cfd4e2_k.jpg',
        attr: 'https://www.flickr.com/photos/minoru_ntt/',
        text: 'rain',
      },
      '11d': {
        img: 'https://farm9.staticflickr.com/8899/18808234182_561f5466c6_k.jpg',
        attr: 'https://www.flickr.com/photos/nealherbert/',
        text: 'Thunderstorm',
      },
      '11n': {
        img: 'https://farm8.staticflickr.com/7172/13881379074_adc3f3691a_k.jpg',
        attr: 'https://www.flickr.com/photos/matthew_eaton/',
        text: 'Thunderstorm',
      },
      '13d': {
        img: 'https://farm4.staticflickr.com/3500/3251874290_6da9504bef_o.jpg',
        attr: 'https://www.flickr.com/photos/boklm/',
        text: 'Snow',
      },
      '13n': {
        img: 'https://farm6.staticflickr.com/5125/5257701655_bbb4790581_o.jpg',
        attr: 'https://www.flickr.com/photos/pasukaru76/',
        text: 'Snow',
      },
      '50d': {
        img: 'https://farm8.staticflickr.com/7545/15884841046_442d1f2a2f_k.jpg',
        attr: 'https://www.flickr.com/photos/mlinksva/',
        text: 'mist',
      },
      '50n': {
        img: 'https://farm5.staticflickr.com/4026/4479273087_30858afd17_o.jpg',
        attr: 'https://www.flickr.com/photos/22723959@N08/',
        text: 'mist',
      },
    };
    return {
      getWeatherInfo: getWeatherInfo,
      toggleUnits: toggleUnits
    };
  });
})();
