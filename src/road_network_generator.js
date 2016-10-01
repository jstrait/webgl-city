"use strict";

var CityTour = CityTour || {};

CityTour.RoadNetworkGenerator = function(terrain) {
  var calculateBlockProbabilityOfBranching = function(mapX1, mapZ1, mapX2, mapZ2) {
    var PERCENTAGE_DISTANCE_THAT_DECAY_BEGINS = 0.4;

    // Guarantee roads along x and z axes
    if (mapX1 === 0 && mapX2 === 0 && mapZ2 >= -CityTour.Config.HALF_BLOCK_ROWS && mapZ2 <= CityTour.Config.HALF_BLOCK_ROWS) {
      return 1.0;
    }
    else if (mapZ1 === 0 && mapZ2 === 0 && mapX2 >= -CityTour.Config.HALF_BLOCK_COLUMNS && mapX2 <= CityTour.Config.HALF_BLOCK_COLUMNS) {
      return 1.0;
    }

    var distanceToCityEdge = Math.min(CityTour.Config.HALF_BLOCK_COLUMNS, CityTour.Config.HALF_BLOCK_ROWS);
    var distanceFromCenter = Math.sqrt((mapX1 * mapX1) + (mapZ1 * mapZ1));
    var percentageFromCenter = (distanceFromCenter / distanceToCityEdge);
    var normalizedPercentageFromCenter;

    if (percentageFromCenter >= PERCENTAGE_DISTANCE_THAT_DECAY_BEGINS) {
      var safeFromDecayDistance = distanceToCityEdge * PERCENTAGE_DISTANCE_THAT_DECAY_BEGINS;
      normalizedPercentageFromCenter = (distanceFromCenter - safeFromDecayDistance) / (distanceToCityEdge - safeFromDecayDistance);
    }
    else {
      normalizedPercentageFromCenter = 0.0;
    }

    return (Math.pow(0.5, normalizedPercentageFromCenter) - 0.5) * 2;
  };

  var isTerrainTooSteep = function(mapX, mapZ, targetMapX, targetMapZ) {
    var MAX_STEEPNESS = Math.PI / 6;

    var heightAtPoint1 = terrain.heightAtCoordinates(mapX, mapZ);
    var heightAtPoint2 = terrain.heightAtCoordinates(targetMapX, targetMapZ);
    var angle = Math.atan2((heightAtPoint1 - heightAtPoint2), CityTour.Config.BLOCK_DEPTH);

    return Math.abs(angle) > MAX_STEEPNESS;
  };

  var shouldConnectIntersections = function(mapX1, mapZ1, mapX2, mapZ2) {
    var probabilityOfConnection = calculateBlockProbabilityOfBranching(mapX1, mapZ1, mapX2, mapZ2);

    return (Math.random() < probabilityOfConnection) && !isTerrainTooSteep(mapX1, mapZ1, mapX2, mapZ2)
  };

  var branchFromIntersection = function(roadNetwork, mapX, mapZ) {
    connectIntersections(roadNetwork, mapX, mapZ, mapX - 1, mapZ);
    connectIntersections(roadNetwork, mapX, mapZ, mapX, mapZ - 1);
    connectIntersections(roadNetwork, mapX, mapZ, mapX + 1, mapZ);
    connectIntersections(roadNetwork, mapX, mapZ, mapX, mapZ + 1);
  };

  var connectIntersections = function(roadNetwork, mapX, mapZ, targetMapX, targetMapZ) {
    if (shouldConnectIntersections(mapX, mapZ, targetMapX, targetMapZ)) {
      if (roadNetwork.hasIntersection(targetMapX, targetMapZ)) {
        roadNetwork.addEdge(mapX, mapZ, targetMapX, targetMapZ);
      }
      else {
        roadNetwork.addEdge(mapX, mapZ, targetMapX, targetMapZ);
        branchFromIntersection(roadNetwork, targetMapX, targetMapZ);
      }
    }
  };

  var roadNetworkGenerator = {};

  roadNetworkGenerator.generate = function() {
    var roadNetwork = new CityTour.RoadNetwork();
    branchFromIntersection(roadNetwork, 0, 0);

    return roadNetwork;
  };

  return roadNetworkGenerator;
};
