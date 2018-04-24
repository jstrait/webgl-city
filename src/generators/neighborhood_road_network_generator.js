"use strict";

var CityTour = CityTour || {};

CityTour.NeighborhoodRoadNetworkGenerator = (function() {
  var DISTANCE_TO_CITY_EDGE = Math.min(CityTour.Config.HALF_BLOCK_COLUMNS, CityTour.Config.HALF_BLOCK_ROWS);
  var MAX_STEEPNESS = Math.PI / 6;
  var NEIGHBORHOOD_COUNT = 5;

  var buildRoadNetwork = function(terrain, config) {
    var roadNetwork = new CityTour.RoadNetwork(terrain);
    var previousCityCenterX, previousCityCenterZ;
    var i;

    buildNeighborhood(terrain, roadNetwork, config);
    for (i = 0; i < NEIGHBORHOOD_COUNT - 1; i++) {
      previousCityCenterX = config.centerMapX;
      previousCityCenterZ = config.centerMapZ;

      config.centerMapX = CityTour.Math.randomInteger(-CityTour.Config.BLOCK_COLUMNS, CityTour.Config.BLOCK_COLUMNS);
      config.centerMapZ = CityTour.Math.randomInteger(-CityTour.Config.BLOCK_ROWS, CityTour.Config.BLOCK_ROWS);

      buildNeighborhood(terrain, roadNetwork, config);

      buildRoadBetweenNeighborhoods(terrain, roadNetwork, previousCityCenterX, previousCityCenterZ, config.centerMapX, config.centerMapZ);
    }

    return roadNetwork;
  };

  var buildRoadBetweenNeighborhoods = function(terrain, roadNetwork, mapX1, mapZ1, mapX2, mapZ2) {
    var terrainCandidateRoadNetwork = new CityTour.TerrainCandidateRoadNetwork(terrain);
    var pathFinder = new CityTour.PathFinder(terrainCandidateRoadNetwork);
    var shortestPath = pathFinder.shortestPath(mapX1, mapZ1, mapX2, mapZ2);
    var previousIntersectionX, previousIntersectionZ;
    var i;

    previousIntersectionX = mapX1;
    previousIntersectionZ = mapZ1;
    for (i = 0; i < shortestPath.length; i++) {
      roadNetwork.addEdge(previousIntersectionX, previousIntersectionZ, shortestPath[i][0], shortestPath[i][1], 0.0, CityTour.RoadNetwork.TERRAIN_SURFACE);
      previousIntersectionX = shortestPath[i][0];
      previousIntersectionZ = shortestPath[i][1];
    }
  };

  var buildNeighborhood = function(terrain, roadNetwork, config) {
    var centerMapX = config.centerMapX;
    var centerMapZ = config.centerMapZ;

    var MIN_MAP_X = Math.max(terrain.minMapX(), -CityTour.Config.HALF_BLOCK_COLUMNS + centerMapX);
    var MAX_MAP_X = Math.min(terrain.maxMapX(), CityTour.Config.HALF_BLOCK_COLUMNS + centerMapX);
    var MIN_MAP_Z = Math.max(terrain.minMapZ(), -CityTour.Config.HALF_BLOCK_ROWS + centerMapZ);
    var MAX_MAP_Z = Math.min(terrain.maxMapZ(), CityTour.Config.HALF_BLOCK_ROWS + centerMapZ);

    var SAFE_FROM_DECAY_DISTANCE = config.safeFromDecayBlocks;

    var probabilityOfBranching = function(mapX1, mapZ1, mapX2, mapZ2) {
      var distanceFromCenter = CityTour.Math.distanceBetweenPoints(centerMapX, centerMapZ, mapX1, mapZ1);
      var normalizedPercentageFromCenter;

      if (distanceFromCenter <= SAFE_FROM_DECAY_DISTANCE) {
        return 1.0;
      }

      return 0.25;
    };

    var isTerrainTooSteep = function(terrain, mapX, mapZ, targetMapX, targetMapZ) {
      var heightAtPoint1 = terrain.heightAtCoordinates(mapX, mapZ);
      var heightAtPoint2 = terrain.heightAtCoordinates(targetMapX, targetMapZ);
      var angle = Math.atan2((heightAtPoint1 - heightAtPoint2), CityTour.Config.BLOCK_DEPTH);

      return Math.abs(angle) > MAX_STEEPNESS;
    };

    var shouldConnectIntersections = function(terrain, mapX1, mapZ1, mapX2, mapZ2) {
      var edgeIsOnLand = terrain.waterHeightAtCoordinates(mapX1, mapZ1) === 0.0 &&
                         terrain.waterHeightAtCoordinates(mapX2, mapZ2) === 0.0;

      return edgeIsOnLand &&
             (Math.random() < probabilityOfBranching(mapX1, mapZ1, mapX2, mapZ2)) &&
             !isTerrainTooSteep(terrain, mapX1, mapZ1, mapX2, mapZ2);
    };

    var branchFromIntersection = function(terrain, roadNetwork, mapX, mapZ) {
      connectIntersections(terrain, roadNetwork, mapX, mapZ, mapX - 1, mapZ);
      connectIntersections(terrain, roadNetwork, mapX, mapZ, mapX, mapZ - 1);
      connectIntersections(terrain, roadNetwork, mapX, mapZ, mapX + 1, mapZ);
      connectIntersections(terrain, roadNetwork, mapX, mapZ, mapX, mapZ + 1);
    };


    var connectIntersections = function(terrain, roadNetwork, mapX, mapZ, targetMapX, targetMapZ) {
      var bridgeAttributes;
      var bridgeIntersectionX, bridgeIntersectionZ;
      var targetIntersectionExists;

      if (targetMapX < MIN_MAP_X || targetMapX > MAX_MAP_X || targetMapZ < MIN_MAP_Z || targetMapZ > MAX_MAP_Z) {
        return;
      }

      if (terrain.waterHeightAtCoordinates(targetMapX, targetMapZ) > 0.0) {
        bridgeAttributes = CityTour.BridgeGenerator.buildBridge(terrain, roadNetwork, mapX, mapZ, targetMapX, targetMapZ, config);

        if (bridgeAttributes !== null) {
          bridgeIntersectionX = mapX;
          bridgeIntersectionZ = mapZ;
          while (bridgeIntersectionX !== bridgeAttributes.endX || bridgeIntersectionZ !== bridgeAttributes.endZ) {
            roadNetwork.addEdge(bridgeIntersectionX,
                                bridgeIntersectionZ,
                                bridgeIntersectionX + bridgeAttributes.xDelta,
                                bridgeIntersectionZ + bridgeAttributes.zDelta,
                                bridgeAttributes.roadDeckHeight,
                                CityTour.RoadNetwork.BRIDGE_SURFACE);
            bridgeIntersectionX += bridgeAttributes.xDelta;
            bridgeIntersectionZ += bridgeAttributes.zDelta;
          }

          branchFromIntersection(terrain, roadNetwork, bridgeAttributes.endX, bridgeAttributes.endZ);
        }
      }
      else {
        if (shouldConnectIntersections(terrain, mapX, mapZ, targetMapX, targetMapZ)) {
          targetIntersectionExists = roadNetwork.hasIntersection(targetMapX, targetMapZ);

          roadNetwork.addEdge(mapX, mapZ, targetMapX, targetMapZ, 0.0, CityTour.RoadNetwork.TERRAIN_SURFACE);
          if (!targetIntersectionExists) {
            branchFromIntersection(terrain, roadNetwork, targetMapX, targetMapZ);
          }
        }
      }
    };

    branchFromIntersection(terrain, roadNetwork, centerMapX, centerMapZ);
  };


  return {
    generate: function(terrain, config) {
      return buildRoadNetwork(terrain, config);
    },
  };

  return neighborhoodRoadNetworkGenerator;
})();
