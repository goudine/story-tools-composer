const moment = require("moment");
const $ = require("jquery");

function composerController(
  $scope,
  $rootScope,
  $log,
  $injector,
  $uibModal,
  MapManager,
  styleService,
  appConfig,
  TimeControlsManager,
  TimeMachine,
  navigationSvc,
  pinSvc,
  uiHelperSvc,
  searchSvc,
  stateSvc,
  $location
) {
  $scope.mapManager = MapManager;
  $scope.stateSvc = stateSvc;
  $scope.pinSvc = pinSvc;
  $scope.uiHelperSvc = uiHelperSvc;
  $scope.searchSvc = searchSvc;
  $scope.navigationSvc = navigationSvc;
  $scope.pin = {};

  $scope.selected = { toc: true };

  $rootScope.$on("$locationChangeSuccess", () => {
    const urlChapterId = $location.path().split("chapter/")[1];
    const chapterCount = stateSvc.getChapterCount();
    if (urlChapterId > chapterCount) {
      $scope.navigationSvc.goToChapter(1);
    }
    $scope.mapManager.initMapLoad();
    $scope.stateSvc.updateCurrentChapterConfig();
  });

  $rootScope.$on("configInitialized", () => {
    $scope.mapManager.initMapLoad();
  });

  $rootScope.$on("pin-added", (event, chapter_index) => {
    // $log.log($scope.pinSvc.getPins(0))
  });

  $rootScope.$on("chapter-added", (event, config) => pinSvc.addChapter());

  $rootScope.$on("chapter-removed", (event, chapter_index) =>
    pinSvc.removeChapter(chapter_index)
  );

  $scope.mode = {
    preview: false
  };
  $scope.timeControlsManager = $injector.instantiate(TimeControlsManager);
  $scope.mapWidth = appConfig.dimensions.mapWidthEditMode;
  $scope.playbackOptions = {
    mode: "instant",
    fixed: false
  };

  $scope.saveMap = () => {
    stateSvc.save();
  };

  $scope.newMap = () => $location.path("/new");

  $scope.showLoadMapDialog = () => {
    const promise = loadMapDialog.show();
    promise.then(result => {
      if (result.mapstoryMapId) {
        $location.path(`/maps/${result.mapstoryMapId}/data/`);
      } else if (result.localMapId) {
        $location.path(`/local/${result.localMapId}`);
      }
    });
  };

  $scope.getMapWidth = preview => {
    if (preview === true) {
      return appConfig.dimensions.mapWidthPreviewMode;
    }
    return appConfig.dimensions.mapWidthEditMode;
  };

  $scope.togglePreviewMode = () => {
    $scope.mapWidth = $scope.getMapWidth($scope.mode.preview);
    $rootScope.mapWidth = $scope.mapWidth;
    if ($scope.mode.preview) {
      // @TODO: reimplement after style issues have been addressed (options appearing)
      // outside of container
      // $("[data-target='#playback-settings']").css("display", "inline-block");
    } else {
      $("[data-target='#playback-settings']").css("display", "none");
    }
    $rootScope.$broadcast("toggleMode", {
      mapWidth: $scope.mapWidth
    });
    setTimeout(() => {
      window.storyMap.getMap().updateSize();
    });
  };

  $scope.layerProperties = lyr => {
    const props = lyr.getProperties();
    const features = delete props.features;
    props.featureCount = (features || []).length;
    return props;
  };

  $scope.updateSelected = (selected, chapterId) => {
    $scope.selected = {};
    if ((chapterId !== null) & (chapterId !== undefined)) {
      navigationSvc.goToChapter(chapterId);
    }
    $scope.selected[selected] = true;
  };

  $scope.nextChapter = navigationSvc.nextChapter;
  $scope.previousChapter = navigationSvc.previousChapter;

  $scope.openStoryModal = function(size) {
    const uibmodalInstance = $uibModal.open({
      templateUrl: "app/ui/templates/storyInfoModal.html",
      size,
      scope: $scope
    });

    uibmodalInstance.result.then(
      selectedItem => {
        $scope.selected = selectedItem;
      },
      () => {
        $log.info(`Modal dismissed at: ${new Date()}`);
      }
    );
  };

  $scope.frameSettings = [];
  const map = MapManager.storyMap.getMap();

  $scope.isDefault = ($event, index) => {
    const elem = document.querySelectorAll(".isDefault");
    for (let i = 0; i < elem.length; i++) {
      elem[i].classList.remove("isDefault");
    }
    $event.currentTarget.parentNode.classList.add("isDefault");
  };

  function transformCoords(loc) {
    return ol.proj.transform(loc, "EPSG:3857", "EPSG:4326");
  }

  $scope.clearBoundingBox = () => {
    MapManager.storyMap
      .getMap()
      .getLayers()
      .forEach(layer => {
        if (layer.get("name") === "boundingBox") {
          map.removeLayer(layer);
          const zoom = ol.animation.zoom({
            resolution: map.getView().getResolution()
          });
          map.beforeRender(zoom);
          map.getView().setZoom(map.getView().getZoom() * 1);
        }
      });
  };

  let draw;
  const layerList = [];

  $scope.zoomToExtent = () => {
    map.getLayers().forEach(layer => {
      if (layer.get("name") === "boundingBox") {
        map.beforeRender(
          ol.animation.pan({
            source: map.getView().getCenter(),
            duration: 500
          }),
          ol.animation.zoom({
            resolution: map.getView().getResolution(),
            duration: 1000,
            easing: ol.easing.easeIn
          })
        );
        map.getView().fit(layer.getSource().getExtent(), map.getSize());
      }
    });
  };

  $scope.zoomOutExtent = () => {
    const zoom = ol.animation.zoom({
      resolution: map.getView().getResolution(),
      duration: 1000,
      easing: ol.easing.easeOut
    });
    map.beforeRender(zoom);
    map.getView().setZoom(map.getView().getZoom() * 0);
  };

  // need to use obj,array when timeline is scrubbed
  $log.log(TimeMachine.lastComputedTicks);

  window.onMoveCallback = data => {
    $scope.checkTimes(data);
  };

  $scope.formatDates = date => {
    const preFormatDate = moment(date);
    const formattedDate = preFormatDate.format("YYYY-MM-DD");
    return formattedDate;
  };

  let dateCount = 0;

  $scope.checkTimes = date => {
    const startDate = $scope.formatDates($scope.frameSettings.startDate);
    const endDate = $scope.formatDates($scope.frameSettings.endDate);
    const storyLayerStartDate = $scope.formatDates(date);

    if (moment(storyLayerStartDate).isSameOrAfter(startDate) && dateCount < 1) {
      $scope.zoomToExtent();
      dateCount = 1;
    } else if (moment(storyLayerStartDate).isSameOrAfter(endDate)) {
      $scope.zoomOutExtent();
    }
  };

  $scope.drawBoundingBox = () => {
    $scope.clearBoundingBox();
    const bbVector = new ol.source.Vector({ wrapX: false });
    const vector = new ol.layer.Vector({
      source: bbVector
    });
    bbVector.on("addfeature", evt => {
      const feature = evt.feature;
      $scope.coords = feature.getGeometry().getCoordinates();
    });
    const geometryFunction = ol.interaction.Draw.createRegularPolygon(4);
    draw = new ol.interaction.Draw({
      source: bbVector,
      type: "Circle",
      geometryFunction
    });
    vector.set("name", "boundingBox");
    map.addLayer(vector);
    map.addInteraction(draw);
  };

  $scope.storyDetails = frameSettings => {
    $scope.frameSettings.push({
      id: Date.now(),
      title: frameSettings.title,
      startDate: frameSettings.startDate,
      startTime: frameSettings.startTime,
      endDate: frameSettings.endDate,
      endTime: frameSettings.endTime,
      bb1: transformCoords([$scope.coords[0][0][0], $scope.coords[0][0][1]]),
      bb2: transformCoords([$scope.coords[0][1][0], $scope.coords[0][1][1]]),
      bb3: transformCoords([$scope.coords[0][2][0], $scope.coords[0][2][1]]),
      bb4: transformCoords([$scope.coords[0][3][0], $scope.coords[0][3][1]])
    });
    stateSvc.setStoryframeDetails(frameSettings);
  };

  $scope.editStoryframe = index => {
    $scope.frameSettings.title = $scope.frameSettings[index].title;
    $scope.frameSettings.startDate = $scope.frameSettings[index].startDate;
    $scope.frameSettings.startTime = $scope.frameSettings[index].startTime;
    $scope.frameSettings.endDate = $scope.frameSettings[index].endDate;
    $scope.frameSettings.endTime = $scope.frameSettings[index].endTime;
    $scope.frameSettings.bb1 = transformCoords([
      $scope.coords[0][0][0],
      $scope.coords[0][0][1]
    ]);
    $scope.frameSettings.bb2 = transformCoords([
      $scope.coords[0][1][0],
      $scope.coords[0][1][1]
    ]);
    $scope.frameSettings.bb3 = transformCoords([
      $scope.coords[0][2][0],
      $scope.coords[0][2][1]
    ]);
    $scope.frameSettings.bb4 = transformCoords([
      $scope.coords[0][3][0],
      $scope.coords[0][3][1]
    ]);

    $scope.currentIndex = index;
    $scope.disableButton = false;
    $scope.disableButton = !$scope.disableButton;
  };

  $scope.updateStoryframe = () => {
    $scope.frameSettings[$scope.currentIndex].title =
      $scope.frameSettings.title;
    $scope.frameSettings[$scope.currentIndex].startDate =
      $scope.frameSettings.startDate;
    $scope.frameSettings[$scope.currentIndex].startTime =
      $scope.frameSettings.startTime;
    $scope.frameSettings[$scope.currentIndex].endDate =
      $scope.frameSettings.endDate;
    $scope.frameSettings[$scope.currentIndex].endTime =
      $scope.frameSettings.endTime;

    $scope.frameSettings[$scope.currentIndex].bb1 = $scope.frameSettings.bb1;
    $scope.frameSettings[$scope.currentIndex].bb2 = $scope.frameSettings.bb2;
    $scope.frameSettings[$scope.currentIndex].bb3 = $scope.frameSettings.bb3;
    $scope.frameSettings[$scope.currentIndex].bb4 = $scope.frameSettings.bb4;

    $scope.disableButton = true;
    $scope.disableButton = !$scope.disableButton;
  };

  $scope.deleteStoryframe = index => {
    $scope.frameSettings.splice(index, 1);
  };
}

module.exports = composerController;
