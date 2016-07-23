"use strict";

var TerrainBuilder = function() {
  var MAX_TERRAIN_HEIGHT = 6;
  var HEIGHT_JITTER_PER_ITERATION = 20;
  var HEIGHT_JITTER_DECAY_PER_ITERATION = 0.65;

  var buildTerrainCoordinates = function() {
    var x, z;
    var terrainCoordinates = [];
    for (x = 0; x <= CityConfig.TERRAIN_COLUMNS; x++) {
      terrainCoordinates[x] = [];

      for (z = 0; z <= CityConfig.TERRAIN_ROWS; z++) {
        terrainCoordinates[x][z] = 0.0;
      }
    }

    // Initial randomization of corners
    terrainCoordinates[0][0] = Math.floor(Math.random() * MAX_TERRAIN_HEIGHT);
    terrainCoordinates[0][CityConfig.TERRAIN_ROWS] = Math.floor(Math.random() * MAX_TERRAIN_HEIGHT);
    terrainCoordinates[CityConfig.TERRAIN_COLUMNS][0] = Math.floor(Math.random() * MAX_TERRAIN_HEIGHT);
    terrainCoordinates[CityConfig.TERRAIN_COLUMNS][CityConfig.TERRAIN_ROWS] = Math.floor(Math.random() * MAX_TERRAIN_HEIGHT);

    // City must be (2^n + 1) blocks on both x and z dimensions for this to work
    midpointDisplace(terrainCoordinates,
                     HEIGHT_JITTER_PER_ITERATION,
                     HEIGHT_JITTER_DECAY_PER_ITERATION,
                     0,
                     CityConfig.TERRAIN_ROWS,
                     CityConfig.TERRAIN_COLUMNS,
                     0);

    // Clamp negative heights to 0
    for (x = 0; x <= CityConfig.TERRAIN_COLUMNS; x++) {
      for (z = 0; z <= CityConfig.TERRAIN_ROWS; z++) {
        //terrainCoordinates[x][z] = Math.max(0.0, terrainCoordinates[x][z]);
      }
    }

    // Convert to final coordinates
    var finalTerrainCoordinates = [];
    for (x = 0; x <= CityConfig.TERRAIN_COLUMNS; x++) {
      finalTerrainCoordinates[x - CityConfig.HALF_TERRAIN_COLUMNS] = [];
      for (z = 0; z <= CityConfig.TERRAIN_ROWS; z++) {
        finalTerrainCoordinates[x - CityConfig.HALF_TERRAIN_COLUMNS][z - CityConfig.HALF_TERRAIN_ROWS] = terrainCoordinates[x][z];
      }
    }

    console.log(finalTerrainCoordinates);

    return finalTerrainCoordinates;
  };

  // Adapted from http://stevelosh.com/blog/2016/02/midpoint-displacement/
  var midpointDisplace = function(terrainCoordinates, jitterAmount, jitterDecay, top, right, bottom, left) {
    var topLeft = terrainCoordinates[top][left];
    var topRight = terrainCoordinates[top][right];
    var bottomLeft = terrainCoordinates[bottom][left];
    var bottomRight = terrainCoordinates[bottom][right];

    var midY = top + ((bottom - top) / 2);
    var midX = left + ((right - left) / 2);

    var jitter;
    var halfJitterAmount = jitterAmount / 2;

    // Left column
    jitter = (Math.random() * jitterAmount) - halfJitterAmount;
    terrainCoordinates[midY][left] = ((topLeft + bottomLeft) / 2) + jitter;
    // Right column
    jitter = (Math.random() * jitterAmount) - halfJitterAmount;
    terrainCoordinates[midY][right] = ((topRight + bottomRight) / 2) + jitter;
    // Top row
    jitter = (Math.random() * jitterAmount) - halfJitterAmount;
    terrainCoordinates[top][midX] = ((topLeft + topRight) / 2) + jitter;
    // Bottom row
    jitter = (Math.random() * jitterAmount) - halfJitterAmount;
    terrainCoordinates[bottom][midX] = ((bottomLeft + bottomRight) / 2) + jitter;

    // Middle
    var middleAverage = (terrainCoordinates[midY][left] + terrainCoordinates[midY][right] + terrainCoordinates[top][midX] + terrainCoordinates[bottom][midX]) / 4;
    terrainCoordinates[midY][midX] = middleAverage;

    if ((midY - top) >= 2) {
      midpointDisplace(terrainCoordinates, (jitterAmount * jitterDecay), jitterDecay, top, midX, midY, left);
      midpointDisplace(terrainCoordinates, (jitterAmount * jitterDecay), jitterDecay, top, right, midY, midX);
      midpointDisplace(terrainCoordinates, (jitterAmount * jitterDecay), jitterDecay, midY, midX, bottom, left);
      midpointDisplace(terrainCoordinates, (jitterAmount * jitterDecay), jitterDecay, midY, right, bottom, midX);
    }
  };

  var terrainBuilder = {};

  terrainBuilder.build = function() {
    return new Terrain(buildTerrainCoordinates());
  };

  return terrainBuilder;
};