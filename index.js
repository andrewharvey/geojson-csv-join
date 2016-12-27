#!/usr/bin/env node

var fs = require('fs');
var csv = require('csv');

var argv = require('yargs')
    .usage('Usage: $0 --geojson-field [string] --csv-field [string] --output [string] --input-geojson [string] --input-csv [string] --cast-fields [string]')
    .demand(['geojson-field', 'csv-field', 'output', 'input-geojson', 'input-csv'])
    .boolean('cast-to-number')
    .alias('n', 'cast-fields')
    .describe('n', 'Comma seperated list of fields from the CSV to cast to a number')
    .help('h')
    .alias('h', 'help')
    .argv;

var geoJsonColumnName = argv['geojson-field'];
var csvColumnName = argv['csv-field'];
var castColumnsToNumber = argv['cast-fields'].split(',');

csv().from.path(argv['input-csv'], {
	delimiter: ',',
	escape: '"'
}).to.array(function(csvData) {
	// find index of join column
	var joinColumnIndex = csvData[0].indexOf(csvColumnName);

	// read the geojson file
	fs.readFile(argv['input-geojson'], 'utf8', function(err, data) {
		if (err) {
			return console.log(err);
		}
		var geojson;
		try {
			geojson = JSON.parse(data);
		} catch (e) {
			console.log("Invalid json.", e);
		}

		var joinedData = getJoinedData(geojson, csvData, joinColumnIndex);

		// write out the joinedData
		fs.writeFile(argv['output'], JSON.stringify(joinedData, null, 4), function(err) {
			if (err) {
				console.log(err);
			} else {
				console.log("GeoJSON saved to out.geojson'");
			}
		});
	});
});

// loop through all the geojson features. 
// for each geojson feature, find if it has a PROPERTY
// of the geoJsonColumnName (it better!) if so, take 
// the value of that column, and loop through the CSV
// file, searching the joinColumnIndex values for matching.
//
// if match, add all the rest of the CSV data onto the geojson
var getJoinedData = function(geojson, csvData, joinColumnIndex) {
	geojson.features.forEach(function(feature) {
		if (feature.hasOwnProperty('properties') && feature.properties.hasOwnProperty(geoJsonColumnName)) {
			var searchValue = feature.properties[geoJsonColumnName];
			if (castColumnsToNumber.indexOf(geoJsonColumnName) !== -1) {
				searchValue = parseInt(searchValue);
			}

			var additionalValuesObj = loopThroughCsv(csvData, joinColumnIndex, searchValue);
			if (additionalValuesObj !== false) {
				// add the data we got from the CSV onto the geojson properties
				for (var prop in additionalValuesObj) {
					feature.properties[prop] = (castColumnsToNumber.indexOf(prop) !== -1) ? parseFloat(additionalValuesObj[prop]) : additionalValuesObj[prop];
				}
			} else {
				// don't add any data and move on.
                                console.log(searchValue + ' not found in CSV');
			}
		}
	}.bind(this));
	return geojson;
};

var loopThroughCsv = function(csvData, joinColumnIndex, searchValue) {
	for (var i = 1; i < csvData.length; i++) {
		var csvRow = csvData[i];
		if (csvRow[joinColumnIndex] == searchValue) {
			// found!
			return objectFromCsvHeaderAndRowNumber(csvData[0], csvData[i]);
		} else {
			// not found.
		}
	}
	return false;
};

var objectFromCsvHeaderAndRowNumber = function(headerArr, dataArr) {
	var retObj = {};
	for (var i = 0; i < headerArr.length; i++) {
		retObj[headerArr[i]] = dataArr[i];
	}
	return retObj;
};
