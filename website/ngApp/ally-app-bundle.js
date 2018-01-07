var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    var ManageAddressPolysController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManageAddressPolysController($http, $q) {
            this.$http = $http;
            this.$q = $q;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageAddressPolysController.prototype.$onInit = function () {
            // Initialize the UI
            this.refreshAddresses();
        };
        ManageAddressPolysController.prototype.getPolyInfo = function (url, polyType) {
            var deferred = this.$q.defer();
            this.isLoading = true;
            var innerThis = this;
            this.$http.get(url).then(function (httpResponse) {
                innerThis.isLoading = false;
                var addresses = httpResponse.data;
                // Mark address as opposed to group bounds
                _.each(addresses, function (a) {
                    a.polyType = polyType;
                    if (polyType == "Group")
                        a.oneLiner = a.shortName + ", " + a.appName;
                });
                $.merge(innerThis.addresses, addresses);
                deferred.resolve(innerThis.addresses);
            }, function (httpResponse) {
                this.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to retrieve addresses: " + errorMessage);
                deferred.reject();
            });
            return deferred.promise;
        };
        ManageAddressPolysController.prototype.getGroupBoundPolys = function () {
            return this.getPolyInfo("/api/AdminMap/GetGroupBounds?filter=" + this.filterAddresses, "Group");
        };
        ManageAddressPolysController.prototype.getAddressPolys = function () {
            return this.getPolyInfo("/api/AdminMap?filter=" + this.filterAddresses, "Address");
        };
        // Get the addresses that are missing bounding polys
        ManageAddressPolysController.prototype.refreshAddresses = function () {
            this.isLoading = true;
            this.addresses = [];
            var innerThis = this;
            this.getAddressPolys().then(function () { return innerThis.getGroupBoundPolys(); }).then(function (addresses) {
                innerThis.addressPoints = [];
                _.each(addresses, function (a) {
                    if (a.gpsPos)
                        innerThis.addressPoints.push(a.gpsPos);
                });
            });
        };
        ManageAddressPolysController.prototype.onSavePoly = function () {
            this.isLoading = true;
            var serverVerts = { vertices: this.selectedAddress.gpsBounds.vertices };
            var url = this.selectedAddress.polyType === "Address" ? ("/api/AdminMap?addressId=" + this.selectedAddress.addressId) : ("/api/AdminMap?groupId=" + this.selectedAddress.groupId);
            var innerThis = this;
            this.$http.put(url, serverVerts).then(function () {
                innerThis.isLoading = false;
            }, function () {
                innerThis.isLoading = false;
            });
        };
        // Occurs when the user clicks an address
        ManageAddressPolysController.prototype.onAddressSelected = function (address) {
            //if ( address.gpsPos )
            //    this.mapInstance.setCenter( { lat: address.gpsPos.lat, lng: address.gpsPos.lon } );
            this.selectedAddress = address;
            // Ensure we have a valid array to work with
            if (!this.selectedAddress.gpsBounds)
                this.selectedAddress.gpsBounds = { vertices: [] };
            if (!this.selectedAddress.gpsBounds.vertices)
                this.selectedAddress.gpsBounds.vertices = [];
            // If the array is empty then create a default rectangle
            if (this.selectedAddress.gpsBounds.vertices.length == 0 && address.gpsPos) {
                var southWest = new google.maps.LatLng(address.gpsPos.lat, address.gpsPos.lon);
                var northEast = new google.maps.LatLng(address.gpsPos.lat + 0.001, address.gpsPos.lon + 0.001);
                address.gpsBounds.vertices = [
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon + 0.001 },
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon + 0.001 }
                ];
            }
            this.selectedGpsPoly = address.gpsBounds;
            //createPolygon( this.mapInstance, address.gpsBounds.vertices );
        };
        ManageAddressPolysController.$inject = ["$http", "$q"];
        return ManageAddressPolysController;
    }());
    Ally.ManageAddressPolysController = ManageAddressPolysController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageAddressPolys", {
    templateUrl: "/ngApp/admin/manage-address-polys.html",
    controller: Ally.ManageAddressPolysController
});

var Ally;
(function (Ally) {
    var GroupEntry = /** @class */ (function () {
        function GroupEntry() {
        }
        return GroupEntry;
    }());
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    var ManageGroupsController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManageGroupsController($timeout, $http) {
            this.$timeout = $timeout;
            this.$http = $http;
            this.newAssociation = new GroupEntry();
            this.changeShortNameData = {};
            /**
             * Retrieve the active group list
             */
            this.retrieveGroups = function () {
                this.isLoading = true;
                var innerThis = this;
                this.$http.get("/api/Association/adminList").then(function (response) {
                    innerThis.isLoading = false;
                    innerThis.groups = response.data;
                    // Add the app type string
                    _.each(innerThis.groups, function (g) {
                        if (g.appName === 0) {
                            g.appNameString = "Condo";
                            g.baseUrl = "https://" + g.shortName + ".CondoAlly.com/";
                        }
                        else if (g.appName === 1) {
                            g.appNameString = "NeighborhoodWatch";
                            g.baseUrl = "https://" + g.shortName + ".WatchAlly.com/";
                        }
                        else if (g.appName === 2) {
                            g.appNameString = "Home";
                            g.baseUrl = "https://" + g.shortName + ".HomeAlly.org/";
                        }
                        else if (g.appName === 3) {
                            g.appNameString = "Hoa";
                            g.baseUrl = "https://" + g.shortName + ".HoaAlly.org/";
                        }
                        else if (g.appName === 4) {
                            g.appNameString = "Neighborhood";
                            g.baseUrl = "https://" + g.shortName + ".NeighborhoodAlly.org/";
                        }
                    });
                }, function () {
                    innerThis.isLoading = false;
                    alert("Failed to retrieve groups");
                });
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageGroupsController.prototype.$onInit = function () {
        };
        /**
         * Change a group's short name
         */
        ManageGroupsController.prototype.changeShortName = function () {
            // Make sure the new short name is only letters and numbers and lower case
            if (/[^a-zA-Z0-9]/.test(this.changeShortNameData.newShortName)) {
                alert("The new short name must be alphanumeric");
                return;
            }
            if (this.changeShortNameData.newShortName !== this.changeShortNameData.newShortName.toLowerCase()) {
                alert("The new short name must be lower-case");
                return;
            }
            if (this.changeShortNameData.newShortName.length === 0) {
                alert("New short name must not be empty");
                return;
            }
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/AdminHelper/ChangeShortName?oldShortName=" + this.changeShortNameData.old + "&newShortName=" + this.changeShortNameData.newShortName, null).success(function (data) {
                innerThis.isLoading = false;
                innerThis.retrieveGroups();
            }).error(function () {
                innerThis.isLoading = false;
                alert("Failed to change short name");
            });
        };
        /**
         * Find the groups to which a user, via e-mail address, belongs
         */
        ManageGroupsController.prototype.findAssociationsForUser = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Admin/findAssociationsForUser?email=" + this.findUserAssociationsEmail).then(function (response) {
                innerThis.isLoading = false;
                innerThis.foundUserAssociations = response.data;
            }, function () {
                innerThis.isLoading = false;
                alert("Failed to find associations for user");
            });
        };
        /**
         * Delete a CHTN group
         */
        ManageGroupsController.prototype.deleteAssociation = function (association) {
            if (!confirm("Are you sure you want to delete this association?"))
                return;
            this.isLoading = true;
            var innerThis = this;
            this.$http.delete("/api/Association/chtn/" + association.groupId).then(function () {
                innerThis.isLoading = false;
                innerThis.retrieveGroups();
            }, function (error) {
                innerThis.isLoading = false;
                console.log(error.data.exceptionMessage);
                alert("Failed to delete group: " + error.data.exceptionMessage);
            });
        };
        /**
         * Add an address to full address
         */
        ManageGroupsController.prototype.addAddress = function () {
            this.newAddressId = null;
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/AdminHelper/AddAddress?address=" + encodeURIComponent(this.newAddress), null).success(function (response) {
                innerThis.isLoading = false;
                innerThis.newAddressId = response.data.newAddressId;
            }).error(function (response) {
                innerThis.isLoading = false;
                alert("Failed to add address: " + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to create a new association
         */
        ManageGroupsController.prototype.onCreateAssociationClick = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/Association", this.newAssociation).then(function () {
                innerThis.isLoading = false;
                innerThis.newAssociation = new GroupEntry();
                innerThis.retrieveGroups();
            });
        };
        ManageGroupsController.prototype.onSendTestEmail = function () {
            this.makeHelperRequest("/api/AdminHelper/SendTestEmail?testEmailRecipient=" + encodeURIComponent(this.testEmailRecipient));
        };
        ManageGroupsController.prototype.onSendTaylorTestEmail = function () {
            this.makeHelperRequest("/api/AdminHelper/SendFromTaylorEmail?testEmailRecipient=" + encodeURIComponent(this.testTaylorEmailRecipient));
        };
        ManageGroupsController.prototype.onSendTestPostmarkEmail = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/AdminHelper/SendTestPostmarkEmail?email=" + this.testPostmarkEmail).success(function () {
                innerThis.isLoading = false;
                alert("Successfully sent email");
            }).error(function () {
                innerThis.isLoading = false;
                alert("Failed to send email");
            });
        };
        ManageGroupsController.prototype.makeHelperRequest = function (apiPath, postData) {
            if (postData === void 0) { postData = null; }
            this.isLoadingHelper = true;
            var request;
            if (postData)
                request = this.$http.post(apiPath, postData);
            else
                request = this.$http.get(apiPath);
            var innerThis = this;
            request.then(function () { return innerThis.isLoadingHelper = false; }, function () { innerThis.isLoadingHelper = false; alert("Failed"); });
        };
        ManageGroupsController.prototype.onTestException = function () {
            this.makeHelperRequest("/api/Association/testException");
        };
        ManageGroupsController.prototype.onClearElmahLogs = function () {
            this.makeHelperRequest("/api/Admin/clearElmah");
        };
        ManageGroupsController.prototype.onClearAppGroupCache = function () {
            this.makeHelperRequest("/api/AdminHelper/ClearGroupCache");
        };
        ManageGroupsController.prototype.onSendInactiveGroupsMail = function () {
            var postData = {
                shortNameLines: this.inactiveShortNames
            };
            this.makeHelperRequest("/api/AdminHelper/SendInactiveGroupsMail", postData);
        };
        ManageGroupsController.$inject = ["$timeout", "$http"];
        return ManageGroupsController;
    }());
    Ally.ManageGroupsController = ManageGroupsController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageGroups", {
    templateUrl: "/ngApp/admin/manage-groups.html",
    controller: Ally.ManageGroupsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to manage group homes/units
     */
    var ManageHomesController = /** @class */ (function () {
        /**
            * The constructor for the class
            */
        function ManageHomesController($http, $q) {
            this.$http = $http;
            this.$q = $q;
            this.isLoading = false;
            this.unitToEdit = new Ally.Unit();
            this.isEdit = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageHomesController.prototype.$onInit = function () {
            this.refresh();
        };
        /**
         * Populate the page
         */
        ManageHomesController.prototype.refresh = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Unit?includeAddressData=true").then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.units = httpResponse.data;
            }, function () {
                innerThis.isLoading = false;
                alert("Failed to load homes");
            });
        };
        /**
         * Occurs when the user presses the button to create a new unit
         */
        ManageHomesController.prototype.onCreateUnitClick = function () {
            $("#AddUnitForm").validate();
            if (!$("#AddUnitForm").valid())
                return;
            this.isLoading = true;
            var innerThis = this;
            var onSave = function () {
                innerThis.isLoading = false;
                innerThis.isEdit = false;
                innerThis.unitToEdit = new Ally.Unit();
                innerThis.refresh();
            };
            if (this.isEdit)
                this.$http.put("/api/Unit", this.unitToEdit).then(onSave);
            else
                this.$http.post("/api/Unit", this.unitToEdit).then(onSave);
        };
        /**
         * Occurs when the user presses the button to edit a unit
         */
        ManageHomesController.prototype.onEditUnitClick = function (unit) {
            this.isEdit = true;
            this.unitToEdit = unit;
            if (unit.fullAddress)
                this.unitToEdit.streetAddress = unit.fullAddress.oneLiner;
        };
        /**
         * Occurs when the user presses the button to delete a unit
         */
        ManageHomesController.prototype.onDeleteUnitClick = function (unit) {
            var innerThis = this;
            this.$http.delete("/api/Unit/" + unit.unitId).then(function () {
                innerThis.refresh();
            });
        };
        /**
         * Occurs when the user presses the button to fast add units
         */
        ManageHomesController.prototype.onFastAddUnits = function () {
            var _this = this;
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/Unit?fastAdd=" + this.lastFastAddName, null).then(function () {
                _this.isLoading = false;
                innerThis.refresh();
            }, function (response) {
                _this.isLoading = false;
                alert("Failed fast add:" + response.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user presses the button to add units from the multi-line text box
         */
        ManageHomesController.prototype.onAddUnitsPerLine = function () {
            var postData = {
                action: "onePerLine",
                lines: this.unitNamePerLine
            };
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/Unit?onePerLine=1", postData).then(function () {
                innerThis.isLoading = false;
                innerThis.refresh();
            }, function () {
                innerThis.isLoading = false;
                alert("Failed");
            });
        };
        /**
         * Occurs when the user presses the button to add homes from the address multi-line text box
         */
        ManageHomesController.prototype.onAddUnitsByAddressPerLine = function () {
            var postData = {
                action: "onePerLine",
                lines: this.unitAddressPerLine
            };
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/Unit/FromAddresses", postData).then(function () {
                innerThis.isLoading = false;
                innerThis.refresh();
            }, function () {
                innerThis.isLoading = false;
                alert("Failed");
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user presses the button to delete all units
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ManageHomesController.prototype.onDeleteAllClick = function () {
            if (!confirm("This will delete every unit! This should only be used for new sites!"))
                return;
            var innerThis = this;
            this.$http.get("/api/Unit?deleteAction=all").then(function () {
                innerThis.refresh();
            }, function () {
            });
        };
        ManageHomesController.$inject = ["$http", "$rootScope"];
        return ManageHomesController;
    }());
    Ally.ManageHomesController = ManageHomesController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageHomes", {
    templateUrl: "/ngApp/admin/manage-homes.html",
    controller: Ally.ManageHomesController
});

var Ally;
(function (Ally) {
    var ActivityLogEntry = /** @class */ (function () {
        function ActivityLogEntry() {
        }
        return ActivityLogEntry;
    }());
    /**
     * The controller for the admin-only page to edit group boundary polygons
     */
    var ViewActivityLogController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ViewActivityLogController($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ViewActivityLogController.prototype.$onInit = function () {
            // Initialize the UI
            this.retrieveEntries();
        };
        /**
         * Load the activity log data
         */
        ViewActivityLogController.prototype.retrieveEntries = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/ActivityLog").then(function (logResponse) {
                innerThis.isLoading = false;
                innerThis.logEntries = logResponse.data;
                // The date comes down as a string so let's convert it to a Date object for the local time zone
                _.each(innerThis.logEntries, function (e) { return e.postDate = moment(e.postDate).toDate(); });
            }, function (errorResponse) {
                innerThis.isLoading = false;
                alert("Failed to load activity log: " + errorResponse.data.exceptionMessage);
            });
        };
        ViewActivityLogController.$inject = ["$http"];
        return ViewActivityLogController;
    }());
    Ally.ViewActivityLogController = ViewActivityLogController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewActivityLog", {
    templateUrl: "/ngApp/admin/view-activity-log.html",
    controller: Ally.ViewActivityLogController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to polygon data
     */
    var ViewPolysController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ViewPolysController($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ViewPolysController.prototype.$onInit = function () {
            this.refreshAddresses();
        };
        ViewPolysController.prototype.findCenter = function (polys) {
            var currentCenter = {
                lat: 0,
                lng: 0
            };
            for (var polyIndex = 0; polyIndex < polys.length; ++polyIndex) {
                var curPoly = polys[polyIndex];
                if (!curPoly)
                    continue;
                var polyCenter = {
                    lat: 0,
                    lng: 0
                };
                for (var vertexIndex = 0; vertexIndex < curPoly.vertices.length; ++vertexIndex) {
                    var vertex = curPoly.vertices[vertexIndex];
                    polyCenter.lat += vertex.lat;
                    polyCenter.lng += vertex.lng;
                }
                polyCenter.lat /= curPoly.vertices.length;
                polyCenter.lng /= curPoly.vertices.length;
                currentCenter.lat += polyCenter.lat;
                currentCenter.lng += polyCenter.lng;
            }
            currentCenter.lat /= polys.length;
            currentCenter.lng /= polys.length;
            return currentCenter;
        };
        // Get the polygons to display
        ViewPolysController.prototype.refreshAddresses = function () {
            var _this = this;
            this.isLoading = true;
            this.neighborhoodPolys = [];
            var innerThis = this;
            this.$http.get("/api/Neighborhood").then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.neighborhoods = httpResponse.data;
                innerThis.neighborhoodPolys = _.select(innerThis.neighborhoods, function (n) { return n.Bounds; });
                innerThis.mapCenter = innerThis.findCenter(_this.neighborhoodPolys);
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to retrieve neighborhoods: " + httpResponse.data.exceptionMessage);
            });
        };
        ;
        ViewPolysController.$inject = ["$http", "$q"];
        return ViewPolysController;
    }());
    Ally.ViewPolysController = ViewPolysController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewPolys", {
    templateUrl: "/ngApp/admin/view-polys.html",
    controller: Ally.ViewPolysController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the admin-only page to view address research data
     */
    var ViewResearchController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ViewResearchController($http) {
            this.$http = $http;
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ViewResearchController.prototype.$onInit = function () {
            this.mapCenter = { lat: 41.99114, lng: -87.690425 };
            // Initialize the UI
            this.refreshCells();
        };
        ViewResearchController.prototype.addLine = function (map, minLat, minLon, maxLat, maxLon) {
            var lineCoordinates = [
                { lat: minLat, lng: minLon },
                { lat: maxLat, lng: maxLon }
            ];
            var linePath = new google.maps.Polyline({
                path: lineCoordinates,
                geodesic: false,
                strokeColor: '#FF0000',
                strokeOpacity: 1.0,
                strokeWeight: 2
            });
            linePath.setMap(map);
        };
        ViewResearchController.prototype.onBuildingSelected = function (building) {
        };
        ViewResearchController.prototype.onCellSelected = function (cell) {
            cell.gpsBounds.mapShapeObject.setOptions({ fillOpacity: 0.1 });
            if (this.selectedCell) {
                this.selectedCell.gpsBounds.mapShapeObject.setOptions({ fillOpacity: 0.35 });
            }
            this.selectedCell = cell;
            _.each(this.selectedCell.streets, function (s) {
                if (s.minLat != 0)
                    this.addLine(cell.gpsBounds.mapShapeObject.map, s.minLat, s.minLon, s.maxLat, s.maxLon);
            });
        };
        // Get the addresses that are missing bounding polys
        ViewResearchController.prototype.refreshCells = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/ResearchMap").then(function (response) {
                innerThis.isLoading = false;
                innerThis.cells = response.data;
                //this.cellPolys = _.map( this.cells, function ( c )
                //{
                //    var result = c.gpsBounds;
                //    result.ownerCell = c;
                //    result.onClick = function ()
                //    {
                //        this.onCellSelected( result.ownerCell );
                //    };
                //    return result;
                //} );
                innerThis.isLoading = true;
                innerThis.$http.get("/api/ResearchMap/Buildings").then(function (httpResponse) {
                    innerThis.isLoading = false;
                    innerThis.buildings = httpResponse.data;
                    //this.cellPolys = _.map( this.buildings, function ( b )
                    //{
                    //    var result = b.footprintPolygon;
                    //    result.ownerBuilding = b;
                    //    result.onClick = function ()
                    //    {
                    //        this.onBuildingSelected( result.ownerBuilding );
                    //    };
                    //    return result;
                    //} );
                    innerThis.buildingPoints = _.map(innerThis.buildings, function (b) {
                        var result = b.addressPos;
                        result.ownerBuilding = b;
                        result.onClick = function () {
                            //this.onBuildingSelected( result.ownerBuilding );
                        };
                        return result;
                    });
                });
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to retrieve cells: " + httpResponse.data.exceptionMessage);
            });
        };
        // Occurs when the user clicks an address
        ViewResearchController.prototype.onAddressSelected = function (address) {
            //if ( address.gpsPos )
            //    this.mapInstance.setCenter( { lat: address.gpsPos.lat, lng: address.gpsPos.lon } );
            this.selectedAddress = address;
            // Ensure we have a valid array to work with
            if (!this.selectedAddress.gpsBounds)
                this.selectedAddress.gpsBounds = { vertices: [] };
            if (!this.selectedAddress.gpsBounds.vertices)
                this.selectedAddress.gpsBounds.vertices = [];
            // If the array is empty then create a default rectangle
            if (this.selectedAddress.gpsBounds.vertices.length == 0 && address.gpsPos) {
                var southWest = new google.maps.LatLng(address.gpsPos.lat, address.gpsPos.lon);
                var northEast = new google.maps.LatLng(address.gpsPos.lat + 0.001, address.gpsPos.lon + 0.001);
                address.gpsBounds.vertices = [
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon },
                    { lat: address.gpsPos.lat + 0.001, lon: address.gpsPos.lon + 0.001 },
                    { lat: address.gpsPos.lat, lon: address.gpsPos.lon + 0.001 }
                ];
            }
            this.selectedGpsPoly = address.gpsBounds;
            //createPolygon( this.mapInstance, address.gpsBounds.vertices );
        };
        ViewResearchController.$inject = ["$http"];
        return ViewResearchController;
    }());
    Ally.ViewResearchController = ViewResearchController;
})(Ally || (Ally = {}));
CA.angularApp.component("viewResearch", {
    templateUrl: "/ngApp/admin/view-research.html",
    controller: Ally.ViewResearchController
});

// DEVLOCAL - Specify your group's API path to make all API requests to the live server, regardless
// of the local URL. This is useful when developing locally. 
var OverrideBaseApiPath = null;
CA.angularApp.config(['$routeProvider', '$httpProvider', '$provide', "SiteInfoProvider", "$locationProvider",
    function ($routeProvider, $httpProvider, $provide, siteInfoProvider, $locationProvider) {
        $locationProvider.hashPrefix('!');
        var subdomain = HtmlUtil.getSubdomain(OverrideBaseApiPath);
        if (subdomain === null && window.location.hash !== "#!/Login") {
            GlobalRedirect(AppConfig.baseUrl);
            return;
        }
        var isLoginRequired = function ($location, $q, siteInfo, appCacheService) {
            var deferred = $q.defer();
            // We have no user information so they must login
            if (!siteInfo.userInfo) {
                // Home, the default page, and login don't need special redirection or user messaging
                if ($location.path() !== "/Home" && $location.path() !== "/Login") {
                    appCacheService.set(appCacheService.Key_AfterLoginRedirect, $location.path());
                    appCacheService.set(appCacheService.Key_WasLoggedIn401, "true");
                }
                deferred.reject();
                $location.path('/Login');
            }
            else
                deferred.resolve();
            return deferred.promise;
        };
        var universalResolvesWithLogin = {
            app: ["$q", "$http", "$rootScope", "$sce", "$location", "xdLocalStorage", "appCacheService",
                function ($q, $http, $rootScope, $sce, $location, xdLocalStorage, appCacheService) {
                    return Ally.SiteInfoHelper.loginInit($q, $http, $rootScope, $sce, xdLocalStorage).then(function (siteInfo) {
                        return isLoginRequired($location, $q, siteInfo, appCacheService);
                    });
                }]
        };
        var universalResolves = {
            app: ["$q", "$http", "$rootScope", "$sce", "xdLocalStorage", Ally.SiteInfoHelper.loginInit]
        };
        // This allows us to require SiteInfo to be retrieved before the app runs
        var customRouteProvider = angular.extend({}, $routeProvider, {
            when: function (path, route) {
                route.resolve = (route.resolve) ? route.resolve : {};
                if (route.allyRole === Role_All)
                    angular.extend(route.resolve, universalResolves);
                else
                    angular.extend(route.resolve, universalResolvesWithLogin);
                $routeProvider.when(path, route);
                return this;
            }
        });
        // Build our Angular routes
        for (var i = 0; i < AppConfig.menu.length; ++i) {
            var menuItem = AppConfig.menu[i];
            var routeObject = {
                controller: menuItem.controller,
                allyRole: menuItem.role
            };
            if (menuItem.templateUrl)
                routeObject.templateUrl = menuItem.templateUrl;
            else
                routeObject.template = menuItem.templateHtml;
            if (menuItem.controllerAs)
                routeObject.controllerAs = menuItem.controllerAs;
            customRouteProvider.when(menuItem.path, routeObject);
        }
        $routeProvider.otherwise({ redirectTo: "/Home" });
        // Create an interceptor to redirect to the login page when unauthorized
        $provide.factory("http403Interceptor", ["$q", "$location", "$rootScope", "appCacheService", "$injector", function ($q, $location, $rootScope, appCacheService, $injector) {
                return {
                    response: function (response) {
                        // Let success pass through
                        return response;
                    },
                    responseError: function (response) {
                        var status = response.status;
                        // 401 - Unauthorized (not logged-in)
                        // 403 - Forbidden (Logged-in, but not allowed to perform the action
                        if (status === 401 || status === 403) {
                            // If the user's action is forbidden and we should not auto-handle the response
                            if (status === 403 && $rootScope.dontHandle403)
                                return $q.reject(response);
                            // If the user's action is forbidden and is logged-in then set this flag so we
                            // can display a helpful error message
                            if (status === 403 && $rootScope.isLoggedIn)
                                appCacheService.set(appCacheService.Key_WasLoggedIn403, "true");
                            // If the user is unauthorized but has saved credentials, try to log-in then retry the request
                            if (status === 401 && HtmlUtil.isValidString(window.localStorage["rememberMe_Email"])) {
                                var $http = $injector.get("$http");
                                // Multiple requests can come in at the same time with 401, so let's store
                                // our login promise so subsequent calls can tie into the first login
                                // request
                                if (!$rootScope.retryLoginDeffered) {
                                    $rootScope.retryLoginDeffered = $q.defer();
                                    var loginInfo = {
                                        emailAddress: window.localStorage["rememberMe_Email"],
                                        password: atob(window.localStorage["rememberMe_Password"])
                                    };
                                    var retryLogin = function () {
                                        $http.post("/api/Login", loginInfo).then(function (httpResponse) {
                                            var loginData = httpResponse.data;
                                            var siteInfo = $injector.get("SiteInfo");
                                            // Store the new auth token
                                            siteInfo.setAuthToken(loginData.authToken);
                                            var loginDeffered = $rootScope.retryLoginDeffered;
                                            loginDeffered.resolve();
                                        }, function () {
                                            // Login failed so bail out all the way
                                            var loginDeffered = $rootScope.retryLoginDeffered;
                                            $rootScope.onLogOut_ClearData();
                                            loginDeffered.reject();
                                        }).finally(function () {
                                            $rootScope.retryLoginDeffered = null;
                                        });
                                    };
                                    // Wait, just a bit, to let any other requests come in with a 401
                                    setTimeout(retryLogin, 1000);
                                }
                                var retryRequestDeferred = $q.defer();
                                $rootScope.retryLoginDeffered.promise.then(function () {
                                    // Retry the request
                                    retryRequestDeferred.resolve($http(response.config));
                                    //$http( response.config ).then( function( newResponse )
                                    //{
                                    //    retryRequestDeferred.resolve( newResponse );
                                    //}, function()
                                    //{
                                    //    retryRequestDeferred.reject( response );
                                    //} );
                                }, function () {
                                    retryRequestDeferred.reject(response);
                                });
                                return retryRequestDeferred.promise;
                            }
                            // Home, the default page, and login don't need special redirection or user messaging
                            if ($location.path() !== "/Home" && $location.path() !== "/Login") {
                                appCacheService.set(appCacheService.Key_AfterLoginRedirect, $location.path());
                                appCacheService.set(appCacheService.Key_WasLoggedIn401, "true");
                            }
                            // The use is not authorized so let's clear the session data
                            $rootScope.onLogOut_ClearData();
                        }
                        // If we didn't handle the response up above then simply reject it
                        return $q.reject(response);
                    }
                };
            }]);
        $httpProvider.interceptors.push('http403Interceptor');
        // Create an interceptor so we can add our auth token header. Also, this allows us to set our
        // own base URL for API calls so local testing can use the live API.
        $provide.factory("apiUriInterceptor", ["$rootScope", function ($rootScope) {
                // If we're making a request because the Angular app's run block, then see if we have
                // a cached auth token
                if (typeof ($rootScope.authToken) !== "string" && window.localStorage)
                    $rootScope.authToken = window.localStorage.getItem("ApiAuthToken");
                return {
                    request: function (reqConfig) {
                        // If we're talking to the Community Ally API server
                        if (HtmlUtil.startsWith(reqConfig.url, "/api/")) {
                            // If we have an overridden URL to use for API requests
                            if (!HtmlUtil.isNullOrWhitespace(OverrideBaseApiPath)) {
                                reqConfig.url = OverrideBaseApiPath + reqConfig.url;
                            }
                            // Add the auth token
                            reqConfig.headers["Authorization"] = "Bearer " + $rootScope.authToken;
                        }
                        return reqConfig;
                    }
                };
            }]);
        $httpProvider.interceptors.push("apiUriInterceptor");
    }]);
CA.angularApp.run(["$rootScope", "$http", "$sce", "$location", "$templateCache", "$cacheFactory", "xdLocalStorage",
    function ($rootScope, $http, $sce, $location, $templateCache, $cacheFactory, xdLocalStorage) {
        $rootScope.bgImagePath = "/assets/images/Backgrounds/";
        $rootScope.appConfig = AppConfig;
        $rootScope.isLoggedIn = false;
        $rootScope.publicSiteInfo = {};
        $rootScope.hideMenu = false;
        $rootScope.isAdmin = false;
        $rootScope.isSiteManager = false;
        $rootScope.menuItems = _.where(AppConfig.menu, function (menuItem) { return !HtmlUtil.isNullOrWhitespace(menuItem.menuTitle); });
        $rootScope.mainMenuItems = _.where($rootScope.menuItems, function (menuItem) { return menuItem.role === Role_Authorized; });
        $rootScope.manageMenuItems = _.where($rootScope.menuItems, function (menuItem) { return menuItem.role === Role_Manager; });
        $rootScope.adminMenuItems = _.where($rootScope.menuItems, function (menuItem) { return menuItem.role === Role_Admin; });
        // Test localStorage here, fails in private browsing mode
        // If we have the association's public info cached then use it to load faster
        if (HtmlUtil.isLocalStorageAllowed()) {
            if (window.localStorage) {
                $rootScope.publicSiteInfo = angular.fromJson(window.localStorage.getItem("siteInfo"));
                $rootScope.authToken = window.localStorage.getItem("ApiAuthToken");
                if ($rootScope.publicSiteInfo === null || $rootScope.publicSiteInfo === undefined)
                    $rootScope.publicSiteInfo = {};
                else {
                    // Update the background
                    //if( !HtmlUtil.isNullOrWhitespace( $rootScope.publicSiteInfo.bgImagePath ) )
                    //    $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + $rootScope.publicSiteInfo.bgImagePath + ")" );
                }
            }
        }
        xdLocalStorage.init({
            /* required */
            iframeUrl: "https://communityally.org/xd-local-storage.html"
        }).then(function () {
            //an option function to be called once the iframe was loaded and ready for action
            //console.log( 'Got xdomain iframe ready' );
        });
        // Clear all local information about the logged-in user
        $rootScope.onLogOut_ClearData = function () {
            $rootScope.userInfo = {};
            $rootScope.isLoggedIn = false;
            $rootScope.isAdmin = false;
            $rootScope.isSiteManager = false;
            $rootScope.authToken = "";
            window.localStorage["rememberMe_Email"] = null;
            window.localStorage["rememberMe_Password"] = null;
            xdLocalStorage.removeItem("allyApiAuthToken");
            // Clear cached request results
            $cacheFactory.get('$http').removeAll();
            if (window.localStorage)
                window.localStorage.removeItem("siteInfo");
            $location.path('/Login');
        };
        // Log-out and notify the server
        $rootScope.onLogOut = function () {
            $http.get("/api/Login/Logout").then($rootScope.onLogOut_ClearData, $rootScope.onLogOut_ClearData);
        };
        // Clear the cache if needed
        $rootScope.$on('$routeChangeStart', function () {
            if (CA.clearTemplateCacheIfNeeded)
                CA.clearTemplateCacheIfNeeded($templateCache);
        });
        // Keep track of our current page
        $rootScope.$on("$routeChangeSuccess", function (event, toState, toParams, fromState) {
            $rootScope.curPath = $location.path();
            // If there is a query string, track it
            var queryString = "";
            var path = $location.path();
            if (path.indexOf("?") !== -1)
                queryString = path.substring(path.indexOf("?"), path.length);
            // If there is a referrer, track it
            var referrer = "";
            if (fromState && fromState.name)
                referrer = $location.protocol() + "://" + $location.host() + "/#" + fromState.url;
            // Tell Segment about the route change
            analytics.page({
                path: path,
                referrer: referrer,
                search: queryString,
                url: $location.absUrl()
            });
        });
    }
]);
//CA.angularApp.provider( '$exceptionHandler', {
//    $get: function( errorLogService )
//    {
//        return errorLogService;
//    }
//} );
//CA.angularApp.factory( "errorLogService", ["$log", function( $log )
//{
//    return function( exception )
//    {
//        $log.error.apply( $log, arguments );
//        if( typeof ( analytics ) !== "undefined" )
//            analytics.track( "AngularJS Error", { error: exception.message, stack: exception.stack } );
//    }
//}] );
var Ally;
(function (Ally) {
    var MenuItem_v3 = /** @class */ (function () {
        function MenuItem_v3() {
        }
        return MenuItem_v3;
    }());
    Ally.MenuItem_v3 = MenuItem_v3;
})(Ally || (Ally = {}));

function RoutePath( path, templateUrl, controller, menuTitle, role )
{
    if( path[0] !== '/' )
        path = "/" + path;

    this.path = path;
    this.templateUrl = templateUrl;
    this.controller = controller;
    this.menuTitle = menuTitle;
    this.role = role || Role_Authorized;
    // authorized, all, manager, admin
    this.controllerAs = typeof controller === "function" ? "vm" : null;
}

function RoutePath_v2( routeOptions )
{
    if( routeOptions.path[0] !== '/' )
        routeOptions.path = "/" + routeOptions.path;

    this.path = routeOptions.path;
    this.templateUrl = routeOptions.templateUrl;
    this.templateHtml = routeOptions.templateHtml;
    this.controller = routeOptions.controller;
    this.menuTitle = routeOptions.menuTitle;
    this.role = routeOptions.role || Role_Authorized;
    // authorized, all, manager, admin
    this.controllerAs = typeof routeOptions.controller === "function" ? "vm" : null;
}


// For use with the newer Angular component objects
function RoutePath_v3( routeOptions )
{
    if( routeOptions.path[0] !== '/' )
        routeOptions.path = "/" + routeOptions.path;

    this.path = routeOptions.path;
    this.templateHtml = routeOptions.templateHtml;
    this.menuTitle = routeOptions.menuTitle;
    this.role = routeOptions.role || Role_Authorized;
}

var Role_Authorized = "authorized";
var Role_All = "all";
var Role_Manager = "manager";
var Role_Admin = "admin";


// The names need to match the PeriodicPaymentFrequency enum
var PeriodicPaymentFrequencies = [
    { name: "Monthly", intervalName: "month", id: 50 },
    { name: "Quarterly", intervalName: "quarter", id: 51 },
    { name: "Semiannually", intervalName: "half-year", id: 52 },
    { name: "Annually", intervalName: "year", id: 53 }
];

function FrequencyIdToInfo( frequencyId )
{
    return PeriodicPaymentFrequencies[frequencyId - 50];
}


///////////////////////////////////////////////////////////////////////////////////////////////////
// Condo Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var CondoAllyAppConfig =
{
    appShortName: "condo",
    appName: "Condo Ally",
    baseTld: "condoally.com",
    baseUrl: "https://condoally.com/",
    segmentWriteKey: "GnlZNd8jKCpDgFqRKbA4nftkuFIaqKPQ",
    homeName: "Unit",
    menu: [
        new RoutePath_v3( { path: "Home", templateHtml: "<chtn-home></chtn-home>", menuTitle: "Home" } ),
        new RoutePath_v3( { path: "BuildingInfo", templateHtml: "<association-info></association-info>", menuTitle: "Documents & Info" } ),
        new RoutePath_v3( { path: "Logbook", templateHtml: "<logbook-page></logbook-page>", controller: "LogbookController", menuTitle: "Calendar" } ),
        new RoutePath_v3( { path: "Map", templateHtml: "<chtn-map></chtn-map>", menuTitle: "Map" } ),
        new RoutePath_v3( { path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Residents" } ),
        new RoutePath_v3( { path: "Committee/:committeeId/:viewName", templateHtml: "<committee-parent></committee-parent>" } ),

        new RoutePath_v3( { path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "SignUp", templateHtml: "<condo-sign-up-wizard></condo-sign-up-wizard>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "EmailAbuse/:idValue", templateHtml: "<email-abuse></email-abuse>", role: Role_All } ),
        new RoutePath_v3( { path: "DiscussionManage/:idValue", templateHtml: "<discussion-manage></discussion-manage>" } ),
        new RoutePath_v3( { path: "NeighborSignUp", templateHtml: "<neighbor-sign-up></neighbor-sign-up>", role: Role_All } ),
        
        new RoutePath_v3( { path: "MyProfile", templateHtml: "<my-profile></my-profile>" } ),
        new RoutePath_v3( { path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Residents", role: Role_Manager } ),
        //new RoutePath_v3( { path: "ManageCommittees", templateHtml: "<manage-committees></manage-committees>", menuTitle: "Committees", role: Role_Manager } ),
        new RoutePath_v3( { path: "ManagePolls", templateHtml: "<manage-polls></manage-polls>", menuTitle: "Polls", role: Role_Manager } ),
        new RoutePath_v3( { path: "ManagePayments", templateHtml: "<manage-payments></manage-payments>", menuTitle: "Online Payments", role: Role_Manager } ),
        new RoutePath_v3( { path: "AssessmentHistory", templateHtml: "<assessment-history></assessment-history>", menuTitle: "Assessment History", role: Role_Manager } ),
        new RoutePath_v3( { path: "Settings", templateHtml: "<chtn-settings></chtn-settings>", menuTitle: "Settings", role: Role_Manager } ),

        new RoutePath_v3( { path: "/Admin/ManageGroups", templateHtml: "<manage-groups></manage-groups>", menuTitle: "Manage Associations", role: Role_Admin } ),
        new RoutePath_v3( { path: "/Admin/ManageHomes", templateHtml: "<manage-homes></manage-homes>", menuTitle: "Manage Homes", role: Role_Admin } ),
        new RoutePath_v3( { path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin } ),
        new RoutePath_v3( { path: "/Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "Edit Addresses", role: Role_Admin } ),
        new RoutePath_v3( { path: "/Admin/ViewPolys", templateHtml: "<view-polys></view-polys>", menuTitle: "View Polygons", role: Role_Admin } ),
        new RoutePath_v3( { path: "/Admin/ViewResearch", templateHtml: "<view-research></view-research>", menuTitle: "View Research", role: Role_Admin } ),
    ]
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Neighborhood Watch Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var WatchAppConfig =
{
    appShortName: "watch",
    appName: "Neighborhood Watch Ally",
    baseTld: "watchally.org",
    baseUrl: "https://watchally.org/",
    menu: [
        new RoutePath( "Home", "/ngApp/watch/member/WatchHome.html", WatchHomeCtrl, "Home" ),
        new RoutePath( "Members", "/ngApp/watch/member/WatchMembers.html", WatchMembersCtrl, "Members" ),
        new RoutePath( "Calendar", "/ngApp/watch/member/WatchCalendar.html", WatchCalendarCtrl, "Calendar" ),

        new RoutePath_v3( { path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "MyProfile", templateHtml: "<my-profile></my-profile>" } ),

        new RoutePath( "ManageMembers", "/ngApp/watch/manager/ManageMembers.html", ManageMembersCtrl, "Members", Role_Manager ),
        new RoutePath( "Settings", "/ngApp/watch/manager/Settings.html", WatchSettingsCtrl, "Settings", Role_Manager ),

        new RoutePath( "/Admin/ManageWatchGroups", "/ngApp/Admin/ManageAssociations.html", "ManageAssociationsController", "Manage Groups", Role_Admin ),
        new RoutePath_v3( { path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin } ),
        new RoutePath_v3( { path: "/Admin/ManageAddressPolys", templateHtml: "<manage-address-polys></manage-address-polys>", menuTitle: "Edit Addresses", role: Role_Admin } ),
    ]
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Service Professional Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var ServiceAppConfig =
{
    appShortName: "service",
    appName: "Service Professional Ally",
    baseTld: "serviceally.org",
    baseUrl: "https://serviceally.org/",
    menu: [
        new RoutePath( "Jobs", "/ngApp/service/Jobs.html", ServiceJobsCtrl, "Jobs" ),
        new RoutePath( "BusinessInfo", "/ngApp/service/BusinessInfo.html", ServiceBusinessInfoCtrl, "Business Info" ),
        new RoutePath( "Banking", "/ngApp/service/BankInfo.html", ServiceBankInfoCtrl, "Banking" ),

        new RoutePath_v3( { path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "MyProfile", templateHtml: "<my-profile></my-profile>" } ),
        
        new RoutePath_v3( { path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin } ),
    ]
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// Home Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var HomeAppConfig =
{
    appShortName: "home",
    appName: "Home Ally",
    baseTld: "homeally.org",
    baseUrl: "https://homeally.org/",
    menu: [
        new RoutePath_v3( { path: "Home", templateHtml: "<home-group-home></home-group-home>", menuTitle: "Home" } ),
        new RoutePath_v2( { path: "ToDo", templateUrl: "/ngApp/home/ToDos.html", controller: ServiceJobsCtrl, menuTitle: "Jobs" } ),
        new RoutePath_v3( { path: "SignUp", templateHtml: "<home-sign-up></home-sign-up>", role: Role_All } ),
        new RoutePath_v3( { path: "ForgotPassword", templateHtml: "<forgot-password></forgot-password>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "Login", templateHtml: "<login-page></login-page>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "Help", templateHtml: "<help-form></help-form>", menuTitle: null, role: Role_All } ),
        new RoutePath_v3( { path: "MyProfile", templateHtml: "<my-profile></my-profile>" } ),

        new RoutePath_v3( { path: "/Admin/ViewActivityLog", templateHtml: "<view-activity-log></view-activity-log>", menuTitle: "View Activity Log", role: Role_Admin } ),
    ]
};


///////////////////////////////////////////////////////////////////////////////////////////////////
// HOA Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var HOAAppConfig = _.clone( CondoAllyAppConfig );
HOAAppConfig.appShortName = "hoa";
HOAAppConfig.appName = "HOA Ally";
HOAAppConfig.baseTld = "hoaally.org";
HOAAppConfig.baseUrl = "https://hoaally.org/";
HOAAppConfig.homeName = "Home";

HOAAppConfig.menu.push( new RoutePath_v3( { path: "HoaSignUp", templateHtml: "<hoa-sign-up-wizard></hoa-sign-up-wizard>", role: Role_All } ) );


///////////////////////////////////////////////////////////////////////////////////////////////////
// Neighborhood Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var NeighborhoodAppConfig = _.clone( CondoAllyAppConfig );
NeighborhoodAppConfig.appShortName = "neighborhood";
NeighborhoodAppConfig.appName = "Neighborhood Ally";
NeighborhoodAppConfig.baseTld = "neighborhoodally.org";
NeighborhoodAppConfig.baseUrl = "https://neighborhoodally.org/";
NeighborhoodAppConfig.homeName = "Home";

// Remove Residents and Manage Residents
NeighborhoodAppConfig.menu = _.reject( NeighborhoodAppConfig.menu, function( mi ) { return mi.menuTitle === "Residents"; } );

// Add them back under the name "Members"
NeighborhoodAppConfig.menu.push( new RoutePath_v3( { path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" } ) );
NeighborhoodAppConfig.menu.splice( 0, 0, new RoutePath_v3( { path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Residents", role: Role_Manager } ) );

// Remove assessment history and add dues history
NeighborhoodAppConfig.menu = _.reject( NeighborhoodAppConfig.menu, function( mi ) { return mi.menuTitle === "Assessment History"; } );
NeighborhoodAppConfig.menu.splice( 3, 0, new RoutePath_v3( { path: "DuesHistory", menuTitle:"Dues History", templateHtml: "<dues-history></dues-history>", role: Role_Manager } ) );

NeighborhoodAppConfig.menu.push( new RoutePath_v3( { path: "NeighborhoodSignUp", templateHtml: "<neighborhood-sign-up-wizard></neighborhood-sign-up-wizard>", role: Role_All } ) );


///////////////////////////////////////////////////////////////////////////////////////////////////
// Block Club Ally
///////////////////////////////////////////////////////////////////////////////////////////////////
var BlockClubAppConfig = _.clone( CondoAllyAppConfig );
BlockClubAppConfig.appShortName = "block-club";
BlockClubAppConfig.appName = "Block Club Ally";
BlockClubAppConfig.baseTld = "chicagoblock.club";
BlockClubAppConfig.baseUrl = "https://chicagoblock.club/";
BlockClubAppConfig.homeName = "Home";

// Remove Residents and Manage Residents
BlockClubAppConfig.menu = _.reject( BlockClubAppConfig.menu, function( mi ) { return mi.menuTitle === "Residents"; } );

// Add them back under the name "Members"
BlockClubAppConfig.menu.push( new RoutePath_v3( { path: "BuildingResidents", templateHtml: "<group-members></group-members>", menuTitle: "Members" } ) );
BlockClubAppConfig.menu.splice( 0, 0, new RoutePath_v3( { path: "ManageResidents", templateHtml: "<manage-residents></manage-residents>", menuTitle: "Residents", role: Role_Manager } ) );

// Remove assessment history and add dues history
BlockClubAppConfig.menu = _.reject( BlockClubAppConfig.menu, function( mi ) { return mi.menuTitle === "Assessment History"; } );
BlockClubAppConfig.menu.splice( 3, 0, new RoutePath_v3( { path: "DuesHistory", menuTitle: "Dues History", templateHtml: "<dues-history></dues-history>", role: Role_Manager } ) );

BlockClubAppConfig.menu.push( new RoutePath_v3( { path: "NeighborhoodSignUp", templateHtml: "<neighborhood-sign-up-wizard></neighborhood-sign-up-wizard>", role: Role_All } ) );



var AppConfig = null;

var lowerDomain = document.domain.toLowerCase();
if( !HtmlUtil.isNullOrWhitespace( OverrideBaseApiPath ) )
    lowerDomain = OverrideBaseApiPath.toLowerCase();

if( lowerDomain.indexOf( "condoally" ) !== -1
    || lowerDomain.indexOf( "hellocondo" ) !== -1)
    AppConfig = CondoAllyAppConfig;
else if( lowerDomain.indexOf( "watchally" ) !== -1 )
    AppConfig = WatchAppConfig;
else if( lowerDomain.indexOf( "serviceally" ) !== -1 )
    AppConfig = ServiceAppConfig;
else if( lowerDomain.indexOf( "homeally" ) !== -1
    || lowerDomain.indexOf( "helloathome" ) !== -1)
    AppConfig = HomeAppConfig;
else if( lowerDomain.indexOf( "hoaally" ) !== -1
    || lowerDomain.indexOf( "hellohoa" ) !== -1)
    AppConfig = HOAAppConfig;
else if( lowerDomain.indexOf( "neighborhoodally" ) !== -1
    || lowerDomain.indexOf( "helloneighborhood" ) !== -1)
    AppConfig = NeighborhoodAppConfig;
else if( lowerDomain.indexOf( "chicagoblock" ) !== -1
    || lowerDomain.indexOf( "blockclub" ) !== -1 )
    AppConfig = BlockClubAppConfig;
else
{
    console.log( "Unknown ally app" );
    AppConfig = CondoAllyAppConfig;
}

// This is redundant due to how JS works, but we have it anyway to prevent confusion
window.AppConfig = AppConfig;


AppConfig.isPublicRoute = function( path )
{
    if( !path )
        path = window.location.hash;

    if( HtmlUtil.startsWith( path, "#!" ) )
        path = path.substr( 2 );

    // If the path has a parameter, only test the first word
    var hasParameter = path.indexOf( "/", 1 ) !== -1;
    if( hasParameter )
        path = path.substr( 0, path.indexOf( "/", 1 ) );

    var route = _.find( AppConfig.menu, function( m )
    {
        var testPath = m.path;
        if( !testPath )
            return false;

        // Only test the first part of paths with parameters
        if( hasParameter && testPath.indexOf( "/", 1 ) !== -1 )
            testPath = testPath.substr( 0, testPath.indexOf( "/", 1 ) );

        return testPath === path;
    } );

    if( !route )
        return false;

    return route.role === Role_All;
};


document.title = AppConfig.appName;
$( document ).ready( function()
{
    $( "header" ).css( "background-image", "url(/assets/images/header-img-" + AppConfig.appShortName + ".jpg)" );
} );
var Ally;
(function (Ally) {
    var PeriodicPaymentFrequency;
    (function (PeriodicPaymentFrequency) {
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Monthly"] = 50] = "Monthly";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Quarterly"] = 51] = "Quarterly";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Semiannually"] = 52] = "Semiannually";
        PeriodicPaymentFrequency[PeriodicPaymentFrequency["Annually"] = 53] = "Annually";
    })(PeriodicPaymentFrequency || (PeriodicPaymentFrequency = {}));
    /**
     * The controller for the page to view resident assessment payment history
     */
    var AssessmentHistoryController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function AssessmentHistoryController($http, $location, siteInfo, appCacheService) {
            this.$http = $http;
            this.$location = $location;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.LocalStorageKey_ShowPaymentInfo = "AssessmentHistory_ShowPaymentInfo";
            // The number of pay periods that are visible on the grid
            this.NumPeriodsVisible = 10;
            this.shouldShowCreateSpecialAssessment = false;
            this.unitPayments = {};
            this.onSavePayment = function () {
                var innerThis = this;
                var onSave = function () {
                    innerThis.isSavingPayment = false;
                    innerThis.editPayment = null;
                    innerThis.retrievePaymentHistory();
                };
                var onError = function (httpResponse) {
                    innerThis.isSavingPayment = false;
                    alert(httpResponse.data.message);
                    innerThis.editPayment = null;
                };
                this.isSavingPayment = true;
                if (this.editPayment.payment.paymentId) {
                    analytics.track("editAssessmentHistoryPayment");
                    this.$http.put("/api/PaymentHistory", this.editPayment.payment).then(onSave, onError);
                }
                else {
                    analytics.track("addAssessmentHistoryPayment");
                    this.$http.post("/api/PaymentHistory", this.editPayment.payment).then(onSave, onError);
                }
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        AssessmentHistoryController.prototype.$onInit = function () {
            if (AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club")
                this.pageTitle = "Membership Dues Payment History";
            else
                this.pageTitle = "Assessment Payment History";
            this.authToken = window.localStorage.getItem("ApiAuthToken");
            this.units = [
                { name: "A", monthPayments: [1, 2, 3] },
                { name: "B", monthPayments: [1, 2, 3] },
                { name: "C", monthPayments: [1, 2, 3] }
            ];
            // Example
            var payment = {
                paymentId: 0,
                year: 2014,
                period: 1,
                isPaid: false,
                amount: 1.23,
                paymentDate: "1/2/14",
                checkNumber: "123",
                unitId: 1
            };
            this.showPaymentInfo = window.localStorage[this.LocalStorageKey_ShowPaymentInfo] === "true";
            var PeriodicPaymentFrequency_Monthly = 50;
            var PeriodicPaymentFrequency_Quarterly = 51;
            var PeriodicPaymentFrequency_Semiannually = 52;
            var PeriodicPaymentFrequency_Annually = 53;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            // Set the period name
            this.payPeriodName = "month";
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly)
                this.payPeriodName = "quarter";
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually)
                this.payPeriodName = "half-year";
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually)
                this.payPeriodName = "year";
            // Set the range values
            this.maxPeriodRange = 12;
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly)
                this.maxPeriodRange = 4;
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually)
                this.maxPeriodRange = 2;
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually)
                this.maxPeriodRange = 1;
            // Set the label values
            this.monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            var shortMonthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            var quarterNames = ["Quarter 1", "Quarter 2", "Quarter 3", "Quarter 4"];
            var shortQuarterNames = ["Q1", "Q2", "Q3", "Q4"];
            var semiannualNames = ["First Half", "Second Half"];
            var shortSemiannualNames = ["1st Half", "2nd Half"];
            this.periodNames = this.monthNames;
            this.shortPeriodNames = shortMonthNames;
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly) {
                this.periodNames = quarterNames;
                this.shortPeriodNames = shortQuarterNames;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually) {
                this.periodNames = semiannualNames;
                this.shortPeriodNames = shortSemiannualNames;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually) {
                this.periodNames = [""];
                this.shortPeriodNames = [""];
            }
            // Set the current period
            this.startPeriodValue = new Date().getMonth() + 2;
            this.startYearValue = new Date().getFullYear();
            if (this.assessmentFrequency === PeriodicPaymentFrequency_Quarterly) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 4) + 2;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Semiannually) {
                this.startPeriodValue = Math.floor(new Date().getMonth() / 6) + 2;
            }
            else if (this.assessmentFrequency === PeriodicPaymentFrequency_Annually) {
                this.startPeriodValue = 1;
                this.startYearValue = new Date().getFullYear() + 1;
            }
            if (this.startPeriodValue > this.maxPeriodRange) {
                this.startPeriodValue = 1;
                this.startYearValue += 1;
            }
            this.isPeriodicPaymentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            this.retrievePaymentHistory();
        };
        AssessmentHistoryController.prototype.onChangePeriodicPaymentTracking = function () {
            if (this.isPeriodicPaymentTrackingEnabled === this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled)
                return;
            // If the user is enabling the tracking then make sure all units have a payment entered
            if (this.isPeriodicPaymentTrackingEnabled) {
                //if( Object.keys(vm.unitPayments).length !== SiteInfo.privateSiteInfo.NumUnits )
                //{
                //    vm.isPeriodicPaymentTrackingEnabled = false;
                //    alert( "You must specify this most recent payment for every unit." );
                //    return;
                //}
            }
            this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled = this.isPeriodicPaymentTrackingEnabled;
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/Association/updatePeriodicPaymentTracking?isPeriodicPaymentTrackingEnabled=" + this.isPeriodicPaymentTrackingEnabled, null).then(function () {
                innerThis.isLoading = false;
            }, function () {
                alert("Failed to update the payment tracking");
                innerThis.isLoading = false;
            });
        };
        /**
         * Add in entries to the payments array so every period has an entry
         */
        AssessmentHistoryController.prototype.fillInEmptyPayments = function (unit) {
            var defaultOwnerUserId = (unit.owners !== null && unit.owners.length > 0) ? unit.owners[0].userId : null;
            var sortedPayments = [];
            var curPeriod = this.startPeriodValue;
            var curYearValue = this.startYearValue;
            for (var periodIndex = 0; periodIndex < this.NumPeriodsVisible; ++periodIndex) {
                if (curPeriod < 1) {
                    curPeriod = this.maxPeriodRange;
                    --curYearValue;
                }
                var curPeriodPayment = _.find(unit.allPayments, function (p) { return p.period === curPeriod && p.year === curYearValue; });
                if (curPeriodPayment === undefined || curPeriodPayment.isEmptyEntry) {
                    curPeriodPayment = {
                        isPaid: false,
                        period: curPeriod,
                        year: curYearValue,
                        amount: unit.assessment,
                        payerUserId: defaultOwnerUserId,
                        paymentDate: new Date(),
                        isEmptyEntry: true
                    };
                }
                sortedPayments.push(curPeriodPayment);
                // curPeriod goes 1-vm.maxPeriodRange
                curPeriod--;
            }
            return sortedPayments;
        };
        AssessmentHistoryController.prototype.viewWePayDetails = function (wePayCheckoutId) {
            this.appCacheService.set("hwpid", wePayCheckoutId);
            this.$location.path("/ManagePayments");
        };
        /**
         * Create a special assessment entry
         */
        AssessmentHistoryController.prototype.addSpecialAssessment = function () {
            // JS is 0 based month plus Angular uses strings so move to 1-based integer for the server
            this.createSpecialAssessment = parseInt(this.createSpecialAssessment) + 1;
            // Create the special assessment
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/PaymentHistory/SpecialAssessment", this.createSpecialAssessment).then(function () {
                innerThis.isLoading = false;
                innerThis.shouldShowCreateSpecialAssessment = false;
                innerThis.retrievePaymentHistory();
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to add special assessment: " + errorMessage);
            });
        };
        /**
         * Display the modal to create special assessments
         */
        AssessmentHistoryController.prototype.showCreateSpecialAssessment = function () {
            this.shouldShowCreateSpecialAssessment = true;
            this.createSpecialAssessment = {
                year: new Date().getFullYear(),
                month: new Date().getMonth().toString(),
                notes: "",
                amount: null
            };
        };
        /**
         * Go back a few pay periods
         */
        AssessmentHistoryController.prototype.browsePast = function () {
            this.startPeriodValue = this.startPeriodValue - 6;
            while (this.startPeriodValue < 1) {
                this.startPeriodValue = this.maxPeriodRange + this.startPeriodValue;
                --this.startYearValue;
            }
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        };
        /**
         * Go ahead a few pay periods
         */
        AssessmentHistoryController.prototype.browseFuture = function () {
            this.startPeriodValue = this.startPeriodValue + 6;
            while (this.startPeriodValue > this.maxPeriodRange) {
                this.startPeriodValue -= this.maxPeriodRange;
                ++this.startYearValue;
            }
            this.displayPaymentsForRange(this.startYearValue, this.startPeriodValue);
        };
        /**
         * Populate the display for a date range
         */
        AssessmentHistoryController.prototype.displayPaymentsForRange = function (startYear, startPeriod) {
            this.startYearValue = startYear;
            this.startPeriodValue = startPeriod;
            this.visiblePeriodNames = [];
            var year = this.startYearValue;
            var currentPeriod = this.startPeriodValue;
            for (var columnIndex = 0; columnIndex < this.NumPeriodsVisible; ++columnIndex) {
                if (currentPeriod < 1) {
                    currentPeriod = this.maxPeriodRange;
                    --year;
                }
                var headerName = this.shortPeriodNames[currentPeriod - 1];
                if (currentPeriod === 1 || currentPeriod === this.maxPeriodRange)
                    headerName += " " + year;
                this.visiblePeriodNames.push({
                    name: headerName,
                    periodIndex: currentPeriod,
                    arrayIndex: columnIndex,
                    year: year
                });
                --currentPeriod;
            }
            // Make sure every visible period has an valid entry object
            var innerThis = this;
            _.each(this.unitPayments, function (unit) {
                unit.payments = innerThis.fillInEmptyPayments(unit);
            });
        };
        /**
         * Populate the payment grid
         */
        AssessmentHistoryController.prototype.retrievePaymentHistory = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/PaymentHistory?oldestDate=").then(function (httpResponse) {
                var paymentInfo = httpResponse.data;
                // Convert the date strings to objects
                for (var i = 0; i < paymentInfo.payments.length; ++i) {
                    if (typeof (paymentInfo.payments[i].paymentDate) === "string" && paymentInfo.payments[i].paymentDate.length > 0)
                        paymentInfo.payments[i].paymentDate = new Date(paymentInfo.payments[i].paymentDate);
                }
                // Build the map of unit ID to unit information
                innerThis.unitPayments = {};
                _.each(paymentInfo.units, function (unit) {
                    innerThis.unitPayments[unit.unitId] = unit;
                    // Only take the first two owners for now
                    innerThis.unitPayments[unit.unitId].displayOwners = _.first(unit.owners, 2);
                    while (innerThis.unitPayments[unit.unitId].displayOwners.length < 2)
                        innerThis.unitPayments[unit.unitId].displayOwners.push({ name: "" });
                    innerThis.unitPayments[unit.unitId].payments = [];
                });
                // Add the payment information to the units
                _.each(paymentInfo.payments, function (payment) {
                    innerThis.unitPayments[payment.unitId].payments.push(payment);
                });
                // Store all of the payments rather than just what is visible
                _.each(paymentInfo.units, function (unit) {
                    unit.allPayments = unit.payments;
                });
                innerThis.displayPaymentsForRange(innerThis.startYearValue, innerThis.startPeriodValue);
                // Sort the units by name
                var sortedUnits = [];
                for (var key in innerThis.unitPayments)
                    sortedUnits.push(innerThis.unitPayments[key]);
                innerThis.unitPayments = _.sortBy(sortedUnits, function (unit) { return unit.name; });
                innerThis.payers = _.sortBy(paymentInfo.payers, function (payer) { return payer.name; });
                innerThis.isLoading = false;
            });
        };
        /**
         * Get the amount paid by all units in a pay period
         */
        AssessmentHistoryController.prototype.getPaymentSumForPayPeriod = function (periodIndex) {
            var sum = 0;
            var unitIds = _.keys(this.unitPayments);
            for (var i = 0; i < unitIds.length; ++i) {
                var unitId = unitIds[i];
                var paymentInfo = this.unitPayments[unitId].payments[periodIndex];
                if (paymentInfo && paymentInfo.isPaid)
                    sum += paymentInfo.amount;
            }
            return sum;
        };
        /**
         * Occurs when the user toggles whether or not to show payment info
         */
        AssessmentHistoryController.prototype.onshowPaymentInfo = function () {
            window.localStorage[this.LocalStorageKey_ShowPaymentInfo] = this.showPaymentInfo;
        };
        /**
         * Occurs when the user clicks a date cell
         */
        AssessmentHistoryController.prototype.onPaymentCellClick = function (unit, periodPayment) {
            periodPayment.unitId = unit.unitId;
            this.editPayment = {
                unit: unit,
                payment: _.clone(periodPayment),
                periodName: this.periodNames[periodPayment.period - 1],
                filteredPayers: _.filter(this.payers, function (payer) {
                    return !_.some(unit.owners, function (owner) {
                        return owner.userId === payer.userId;
                    });
                })
            };
            setTimeout(function () { $("#paid-amount-textbox").focus(); }, 10);
        };
        AssessmentHistoryController.$inject = ["$http", "$location", "SiteInfo", "appCacheService"];
        return AssessmentHistoryController;
    }());
    Ally.AssessmentHistoryController = AssessmentHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentHistory", {
    templateUrl: "/ngApp/chtn/manager/assessment-history.html",
    controller: Ally.AssessmentHistoryController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to view membership dues payment history
     */
    var DuesHistoryController = /** @class */ (function () {
        function DuesHistoryController() {
        }
        return DuesHistoryController;
    }());
    Ally.DuesHistoryController = DuesHistoryController;
})(Ally || (Ally = {}));
CA.angularApp.component("duesHistory", {
    templateUrl: "/ngApp/chtn/manager/dues-history.html",
    controller: Ally.DuesHistoryController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    var Committee = /** @class */ (function () {
        function Committee() {
        }
        return Committee;
    }());
    Ally.Committee = Committee;
    /**
     * The controller for the page to add, edit, and delete committees
     */
    var ManageCommitteesController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageCommitteesController($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.includeInactive = false;
            this.committees = [];
            this.newCommittee = new Committee();
            this.isLoading = false;
            this.newCommittee.committeeType = "Ongoing";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageCommitteesController.prototype.$onInit = function () {
            this.retrieveCommittees();
        };
        /**
        * Called when the user chooses to deactivate a committee
        */
        ManageCommitteesController.prototype.toggleCommitteeActive = function (committee) {
            this.isLoading = true;
            var putUri = (committee.deactivationDateUtc ? "/api/Committee/Reactivate/" : "/api/Committee/Deactivate/") + committee.committeeId;
            var innerThis = this;
            this.$http.put(putUri, null).success(function (committees) {
                innerThis.isLoading = false;
                innerThis.retrieveCommittees();
            }).error(function (exc) {
                innerThis.isLoading = false;
                alert("Failed to retrieve the modify committee: " + exc.exceptionMessage);
            });
        };
        /**
        * Retrieve the list of available committees
        */
        ManageCommitteesController.prototype.retrieveCommittees = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Committee").success(function (committees) {
                innerThis.isLoading = false;
                innerThis.committees = committees;
                // Convert the last login timestamps to local time
                _.forEach(committees, function (c) { return c.creationDateUtc = moment.utc(c.creationDateUtc).toDate(); });
            }).error(function (exc) {
                innerThis.isLoading = false;
                alert("Failed to retrieve the committee listing");
            });
        };
        /**
        * Create a new committee
        */
        ManageCommitteesController.prototype.createCommittee = function () {
            if (HtmlUtil.isNullOrWhitespace(this.newCommittee.name)) {
                alert("Please enter a name.");
                return;
            }
            this.isLoading = true;
            var postUri = "/api/Committee?name=" + encodeURIComponent(this.newCommittee.name) + "&type=" + encodeURIComponent(this.newCommittee.committeeType);
            var innerThis = this;
            this.$http.post(postUri, null).success(function () {
                innerThis.isLoading = false;
                innerThis.retrieveCommittees();
            }).error(function (error) {
                innerThis.isLoading = false;
                alert("Failed to create the committee: " + error.exceptionMessage);
            });
        };
        ManageCommitteesController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
        return ManageCommitteesController;
    }());
    Ally.ManageCommitteesController = ManageCommitteesController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageCommittees", {
    templateUrl: "/ngApp/chtn/manager/manage-committees.html",
    controller: Ally.ManageCommitteesController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to view online payment information
     */
    var ManagePaymentsController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function ManagePaymentsController($http, siteInfo, appCacheService) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.appCacheService = appCacheService;
            this.PaymentHistory = [];
            this.message = "";
            this.showPaymentPage = AppConfig.appShortName === "condo";
            this.PeriodicPaymentFrequencies = PeriodicPaymentFrequencies;
            this.AssociationPaysAch = true;
            this.AssociationPaysCC = false; // Payer pays credit card fees
            this.lateFeeInfo = {};
            this.isLoading = false;
            this.isLoadingUnits = false;
            this.isLoadingPayment = false;
            this.isLoadingLateFee = false;
            this.isLoadingCheckoutDetails = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManagePaymentsController.prototype.$onInit = function () {
            this.highlightWePayCheckoutId = this.appCacheService.getAndClear("hwpid");
            this.isAssessmentTrackingEnabled = this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled;
            this.payments = [
                {
                    Date: "",
                    Unit: "",
                    Resident: "",
                    Amount: "",
                    Status: ""
                }
            ];
            this.testFee = {
                amount: 200
            };
            this.signUpStep = 0;
            this.signUpInfo =
                {
                    hasAssessments: null,
                    assessmentFrequency: 0,
                    allPayTheSame: true,
                    allPayTheSameAmount: null,
                    units: []
                };
            // Populate the page
            this.refresh();
        };
        /**
         * Load all of the data on the page
         */
        ManagePaymentsController.prototype.refresh = function () {
            var _this = this;
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/OnlinePayment").then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.hasAssessments = innerThis.siteInfo.privateSiteInfo.hasAssessments;
                var data = httpResponse.data;
                innerThis.paymentInfo = data;
                innerThis.lateFeeInfo =
                    {
                        lateFeeDayOfMonth: data.lateFeeDayOfMonth,
                        lateFeeAmount: data.lateFeeAmount
                    };
                // Prepend flat fee late fees with a $
                if (!HtmlUtil.isNullOrWhitespace(_this.lateFeeInfo.lateFeeAmount)
                    && !HtmlUtil.endsWith(_this.lateFeeInfo.lateFeeAmount, "%"))
                    _this.lateFeeInfo.lateFeeAmount = "$" + _this.lateFeeInfo.lateFeeAmount;
                innerThis.refreshUnits();
                innerThis.updateTestFee();
            });
        };
        /**
         * Load all of the untis on the page
         */
        ManagePaymentsController.prototype.refreshUnits = function () {
            // Load the units and assessments
            this.isLoadingUnits = true;
            var innerThis = this;
            this.$http.get("/api/Unit").then(function (httpResponse) {
                innerThis.units = httpResponse.data;
                _.each(innerThis.units, function (u) { if (u.adjustedAssessment === null) {
                    u.adjustedAssessment = u.assessment;
                } });
                innerThis.assessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + u.assessment; }, 0);
                innerThis.adjustedAssessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
                innerThis.isLoadingUnits = false;
            });
        };
        ManagePaymentsController.prototype.getLateFeeDateSuper = function () {
            var dayOfMonth = this.lateFeeInfo.lateFeeDayOfMonth;
            if (typeof (dayOfMonth) === "string") {
                if (HtmlUtil.isNullOrWhitespace(dayOfMonth))
                    return "";
                dayOfMonth = parseInt(dayOfMonth);
                this.lateFeeInfo.lateFeeDayOfMonth = dayOfMonth;
            }
            if (dayOfMonth == NaN || dayOfMonth < 1) {
                dayOfMonth = "";
                return "";
            }
            if (dayOfMonth > 31) {
                dayOfMonth = "";
                return "";
            }
            // Teens are a special case
            if (dayOfMonth >= 10 && dayOfMonth <= 20)
                return "th";
            var onesDigit = dayOfMonth % 10;
            if (onesDigit === 1)
                return "st";
            else if (onesDigit === 2)
                return "nd";
            if (onesDigit === 3)
                return "rd";
            return "th";
        };
        ManagePaymentsController.prototype.selectText = function () {
            // HACK: Timeout needed to fire after x-editable's activation
            setTimeout(function () {
                $('.editable-input').select();
            }, 50);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user presses the button to send money from the WePay account to their
        // association's account
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ManagePaymentsController.prototype.onWithdrawalClick = function () {
            this.message = "";
            this.$http.get("/api/OnlinePayment?action=withdrawal").then(function (httpResponse) {
                var withdrawalInfo = httpResponse.data;
                if (withdrawalInfo.redirectUri)
                    window.location.href = withdrawalInfo.redirectUri;
                else
                    this.message = withdrawalInfo.message;
            }, function (httpResponse) {
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    this.message = httpResponse.data.exceptionMessage;
            });
        };
        /**
         * Occurs when the user presses the button to edit a unit's assessment
         */
        ManagePaymentsController.prototype.onUnitAssessmentChanged = function (unit) {
            this.isLoadingUnits = true;
            // The UI inputs string values for these fields, so convert them to numbers
            if (typeof (unit.assessment) === "string")
                unit.assessment = parseFloat(unit.assessment);
            if (typeof (unit.adjustedAssessment) === "string")
                unit.adjustedAssessment = parseFloat(unit.adjustedAssessment);
            var innerThis = this;
            this.$http.put("/api/Unit", unit).then(function () {
                innerThis.isLoadingUnits = false;
                innerThis.assessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + u.assessment; }, 0);
                innerThis.adjustedAssessmentSum = _.reduce(innerThis.units, function (memo, u) { return memo + (u.adjustedAssessment || 0); }, 0);
            });
        };
        /**
         * Occurs when the user changes who covers the WePay transaction fee
         */
        ManagePaymentsController.prototype.onChangeFeePayerInfo = function (payTypeUpdated) {
            // See if any users have auto-pay setup for this payment type
            var needsFullRefresh = false;
            var needsReloadOfPage = false;
            if (this.paymentInfo.usersWithAutoPay && this.paymentInfo.usersWithAutoPay.length > 0) {
                var AchDBString = "ACH";
                var CreditDBString = "Credit Card";
                var usersAffected = [];
                if (payTypeUpdated === "ach")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, function (u) { return u.wePayAutoPayFundingSource === AchDBString; });
                else if (payTypeUpdated === "cc")
                    usersAffected = _.where(this.paymentInfo.usersWithAutoPay, function (u) { return u.wePayAutoPayFundingSource === CreditDBString; });
                // If users will be affected then display an error message to the user
                if (usersAffected.length > 0) {
                    // We need to reload the site if the user is affected so the home page updates that
                    // the user does not have auto-pay enabled
                    needsReloadOfPage = _.find(usersAffected, function (u) { return u.userId === this.$parent.userInfo.userId; }) !== undefined;
                    needsFullRefresh = true;
                    var message = "Adjusting the fee payer type will cause the follow units to have their auto-pay cancelled and they will be informed by e-mail:\n";
                    _.each(usersAffected, function (u) { message += u.ownerName + "\n"; });
                    message += "\nDo you want to continue?";
                    if (!confirm(message)) {
                        // Reset the setting
                        if (payTypeUpdated === "ach")
                            this.paymentInfo.payerPaysAchFee = !this.paymentInfo.payerPaysAchFee;
                        else
                            this.paymentInfo.payerPaysCCFee = !this.paymentInfo.payerPaysCCFee;
                        return;
                    }
                }
            }
            this.isLoadingPayment = true;
            var innerThis = this;
            this.$http.put("/api/OnlinePayment", this.paymentInfo).then(function () {
                if (needsReloadOfPage)
                    window.location.reload();
                else {
                    innerThis.isLoadingPayment = false;
                    // We need to refresh our data so we don't pop-up the auto-pay cancel warning again
                    if (needsFullRefresh)
                        innerThis.refresh();
                }
            });
            this.updateTestFee();
        };
        /**
         * Used to show the sum of all assessments
         */
        ManagePaymentsController.prototype.getSignUpSum = function () {
            return _.reduce(this.signUpInfo.units, function (memo, u) { return memo + parseFloat(u.assessment); }, 0);
        };
        /**
         * Occurs when the user changes where the WePay fee payment comes from
         */
        ManagePaymentsController.prototype.signUp_HasAssessments = function (hasAssessments) {
            this.signUpInfo.hasAssessments = hasAssessments;
            if (this.signUpInfo.hasAssessments) {
                this.signUpInfo.units = [];
                _.each(this.units, function (u) {
                    this.signUpInfo.units.push({ unitId: u.unitId, name: u.name, assessment: 0 });
                });
                this.signUpStep = 1;
            }
            else {
                this.signUp_Commit();
            }
        };
        /**
         * Handle the assessment frequency
         */
        ManagePaymentsController.prototype.signUp_AssessmentFrequency = function (frequencyIndex) {
            this.signUpInfo.frequencyIndex = frequencyIndex;
            this.signUpInfo.assessmentFrequency = PeriodicPaymentFrequencies[frequencyIndex].name;
            this.signUpStep = 2;
        };
        /**
         * Save the late fee info
         */
        ManagePaymentsController.prototype.saveLateFee = function () {
            this.isLoadingLateFee = true;
            var innerThis = this;
            this.$http.put("/api/OnlinePayment/LateFee?dayOfMonth=" + this.lateFeeInfo.lateFeeDayOfMonth + "&lateFeeAmount=" + this.lateFeeInfo.lateFeeAmount, null).then(function (httpResponse) {
                innerThis.isLoadingLateFee = false;
                var lateFeeResult = httpResponse.data;
                if (!lateFeeResult || !lateFeeResult.feeAmount || lateFeeResult.feeType === 0) {
                    if (innerThis.lateFeeInfo.lateFeeDayOfMonth !== "")
                        alert("Failed to save the late fee. Please enter only a number for the date (ex. 5) and an amount (ex. 12.34) or percent (ex. 5%) for the fee. To disable late fees, clear the date field and hit save.");
                    innerThis.lateFeeInfo.lateFeeDayOfMonth = "";
                    innerThis.lateFeeInfo.lateFeeAmount = null;
                }
                else {
                    innerThis.lateFeeInfo.lateFeeAmount = lateFeeResult.feeAmount;
                    // feeType of 2 is percent, 1 is flat, and 0 is invalid
                    if (lateFeeResult.feeType === 1)
                        innerThis.lateFeeInfo.lateFeeAmount = "$" + innerThis.lateFeeInfo.lateFeeAmount;
                    else if (lateFeeResult.feeType === 2)
                        innerThis.lateFeeInfo.lateFeeAmount = "" + innerThis.lateFeeInfo.lateFeeAmount + "%";
                }
            }, function (httpResponse) {
                innerThis.isLoadingLateFee = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to update late fee: " + errorMessage);
            });
        };
        /**
         * Show the WePay info for a specific transaction
         */
        ManagePaymentsController.prototype.showWePayCheckoutInfo = function (wePayCheckoutId) {
            this.viewingCheckoutId = wePayCheckoutId;
            if (!this.viewingCheckoutId)
                return;
            this.isLoadingCheckoutDetails = true;
            this.checkoutInfo = {};
            var innerThis = this;
            this.$http.get("/api/OnlinePayment/CheckoutInfo?checkoutId=" + wePayCheckoutId, { cache: true }).then(function (httpResponse) {
                innerThis.isLoadingCheckoutDetails = false;
                innerThis.checkoutInfo = httpResponse.data;
            }, function (httpResponse) {
                innerThis.isLoadingCheckoutDetails = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to retrieve checkout details: " + errorMessage);
            });
        };
        /**
         * Save the sign-up answers
         */
        ManagePaymentsController.prototype.signUp_Commit = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/OnlinePayment/BasicInfo", this.signUpInfo).then(function () {
                innerThis.isLoading = false;
                // Update the unit assessments
                innerThis.refreshUnits();
                // Update the assesment flag
                innerThis.hasAssessments = this.signUpInfo.hasAssessments;
                innerThis.siteInfo.privateSiteInfo.hasAssessments = this.hasAssessments;
            }, function (httpResponse) {
                innerThis.isLoading = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    innerThis.message = httpResponse.data.exceptionMessage;
            });
        };
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        ManagePaymentsController.prototype.updateTestFee = function () {
            var numericAmount = parseFloat(this.testFee.amount);
            if (this.paymentInfo.payerPaysAchFee) {
                this.testFee.achResidentPays = numericAmount + 1.5;
                this.testFee.achAssociationReceives = numericAmount;
            }
            else {
                this.testFee.achResidentPays = numericAmount;
                this.testFee.achAssociationReceives = numericAmount - 1.5;
            }
            var ccFee = 1.3 + (numericAmount * 0.029);
            if (this.paymentInfo.payerPaysCCFee) {
                this.testFee.ccResidentPays = numericAmount + ccFee;
                this.testFee.ccAssociationReceives = numericAmount;
            }
            else {
                this.testFee.ccResidentPays = numericAmount;
                this.testFee.ccAssociationReceives = numericAmount - ccFee;
            }
        };
        /**
         * Allow the admin to clear the WePay access token for testing
         */
        ManagePaymentsController.prototype.admin_ClearAccessToken = function () {
            alert("TODO hook this up");
        };
        ManagePaymentsController.$inject = ["$http", "SiteInfo", "appCacheService"];
        return ManagePaymentsController;
    }());
    Ally.ManagePaymentsController = ManagePaymentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("managePayments", {
    templateUrl: "/ngApp/chtn/manager/manage-payments.html",
    controller: Ally.ManagePaymentsController
});

var Ally;
(function (Ally) {
    var Poll = /** @class */ (function () {
        function Poll() {
        }
        return Poll;
    }());
    /**
     * The controller for the manage polls page
     */
    var ManagePollsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManagePollsController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.pollHistory = [];
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManagePollsController.prototype.$onInit = function () {
            var threeDaysLater = new Date();
            threeDaysLater.setDate(new Date().getDate() + 3);
            this.defaultPoll = new Poll();
            this.defaultPoll.expirationDate = threeDaysLater;
            this.defaultPoll.answers = [
                {
                    answerText: "Yes"
                },
                {
                    answerText: "No"
                }
            ];
            // The new or existing news item that's being edited by the user
            this.editingItem = angular.copy(this.defaultPoll);
            this.retrieveItems();
        };
        /**
         * Populate the poll data
         */
        ManagePollsController.prototype.retrieveItems = function () {
            var AbstainAnswerSortOrder = 101;
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Poll").then(function (httpResponse) {
                innerThis.pollHistory = httpResponse.data;
                // Convert the date strings to objects
                for (var i = 0; i < innerThis.pollHistory.length; ++i) {
                    // The date comes down as a string so we need to convert it
                    innerThis.pollHistory[i].expirationDate = new Date(innerThis.pollHistory[i].expirationDate);
                    // Remove the abstain answer since it can't be edited, but save the full answer
                    // list for displaying results
                    innerThis.pollHistory[i].fullResultAnswers = innerThis.pollHistory[i].answers;
                    innerThis.pollHistory[i].answers = _.reject(innerThis.pollHistory[i].answers, function (pa) { return pa.sortOrder === AbstainAnswerSortOrder; });
                }
                innerThis.isLoading = false;
            });
        };
        /**
         * Add a new answer
         */
        ManagePollsController.prototype.addAnswer = function () {
            if (!this.editingItem.answers)
                this.editingItem.answers = [];
            if (this.editingItem.answers.length > 19) {
                alert("You can only have 20 answers maxiumum per poll.");
                return;
            }
            this.editingItem.answers.push({ answerText: '' });
        };
        /**
         * Stop editing a poll and reset the form
         */
        ManagePollsController.prototype.cancelEdit = function () {
            this.editingItem = angular.copy(this.defaultPoll);
        };
        /**
         * Occurs when the user presses the button to save a poll
         */
        ManagePollsController.prototype.onSaveItem = function () {
            if (this.editingItem === null)
                return;
            //$( "#new-item-form" ).validate();
            //if ( !$( "#new-item-form" ).valid() )
            //    return;
            this.isLoading = true;
            var innerThis = this;
            var onSave = function () {
                innerThis.isLoading = false;
                innerThis.editingItem = angular.copy(innerThis.defaultPoll);
                innerThis.retrieveItems();
            };
            var onFailure = function (response) {
                innerThis.isLoading = false;
                alert("Failed to save poll: " + response.data.exceptionMessage);
            };
            // If we're editing an existing news item
            if (typeof (this.editingItem.pollId) === "number") {
                analytics.track("editPoll");
                this.$http.put("/api/Poll", this.editingItem).then(onSave, onFailure);
            }
            else {
                analytics.track("addPoll");
                this.$http.post("/api/Poll", this.editingItem).then(onSave, onFailure);
            }
        };
        /**
         * Occurs when the user wants to edit an existing poll
         */
        ManagePollsController.prototype.onEditItem = function (item) {
            this.editingItem = angular.copy(item);
            window.scrollTo(0, 0);
        };
        /**
         * Occurs when the user wants to delete a poll
         */
        ManagePollsController.prototype.onDeleteItem = function (item) {
            this.isLoading = true;
            var innerThis = this;
            this.$http.delete("/api/Poll?pollId=" + item.pollId).then(function () {
                innerThis.retrieveItems();
            }, function (httpResponse) {
                innerThis.isLoading = false;
                if (httpResponse.status === 403)
                    alert("You cannot authorized to delete this poll.");
            });
        };
        /**
         * Occurs when the user wants to view the results for a poll
         */
        ManagePollsController.prototype.onViewResults = function (poll) {
            if (!poll) {
                this.viewingPollResults = null;
                return;
            }
            // Group the responses by the answer they selected
            var responsesGroupedByAnswer = _.groupBy(poll.responses, "answerId");
            poll.chartData = [];
            poll.chartLabels = [];
            // Go through each answer and store the name and count for that answer
            for (var answerId in responsesGroupedByAnswer) {
                // Convert the string to int
                //let answerId = parseInt( (answerId as string) );
                // Ignore inherited properties
                if (!responsesGroupedByAnswer.hasOwnProperty(answerId))
                    continue;
                var answer = _.find(poll.fullResultAnswers, function (a) { return a.pollAnswerId === answerId; });
                if (answer) {
                    poll.chartLabels.push(answer.answerText);
                    poll.chartData.push(responsesGroupedByAnswer[answerId].length);
                }
            }
            if (poll.responses && poll.responses.length < this.siteInfo.privateSiteInfo.numUnits) {
                poll.chartLabels.push("No Response");
                poll.chartData.push(this.siteInfo.privateSiteInfo.numUnits - poll.responses.length);
            }
            // Build the array for the counts to the right of the chart
            poll.answerCounts = [];
            for (var i = 0; i < poll.chartLabels.length; ++i) {
                poll.answerCounts.push({
                    label: poll.chartLabels[i],
                    count: poll.chartData[i]
                });
            }
            this.chartLabels = poll.chartLabels;
            this.chartData = poll.chartData;
            this.viewingPollResults = poll;
        };
        ManagePollsController.$inject = ["$http", "SiteInfo"];
        return ManagePollsController;
    }());
    Ally.ManagePollsController = ManagePollsController;
})(Ally || (Ally = {}));
CA.angularApp.component("managePolls", {
    templateUrl: "/ngApp/chtn/manager/manage-polls.html",
    controller: Ally.ManagePollsController
});

/// <reference path="../../../Scripts/typings/ui-grid/ui-grid.d.ts" />
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    var Unit = /** @class */ (function () {
        function Unit() {
        }
        return Unit;
    }());
    Ally.Unit = Unit;
    var HomeEntry = /** @class */ (function () {
        function HomeEntry() {
        }
        return HomeEntry;
    }());
    Ally.HomeEntry = HomeEntry;
    var HomeEntryWithName = /** @class */ (function (_super) {
        __extends(HomeEntryWithName, _super);
        function HomeEntryWithName() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return HomeEntryWithName;
    }(Ally.HomeEntry));
    Ally.HomeEntryWithName = HomeEntryWithName;
    var Member = /** @class */ (function () {
        function Member() {
        }
        return Member;
    }());
    Ally.Member = Member;
    var Resident = /** @class */ (function (_super) {
        __extends(Resident, _super);
        function Resident() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return Resident;
    }(Member));
    Ally.Resident = Resident;
    var UpdateResident = /** @class */ (function (_super) {
        __extends(UpdateResident, _super);
        function UpdateResident() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return UpdateResident;
    }(Resident));
    Ally.UpdateResident = UpdateResident;
    /**
     * The controller for the page to add, edit, and delete members from the site
     */
    var ManageResidentsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ManageResidentsController($http, $rootScope, $interval, fellowResidents, uiGridConstants, siteInfo) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$interval = $interval;
            this.fellowResidents = fellowResidents;
            this.uiGridConstants = uiGridConstants;
            this.siteInfo = siteInfo;
            this.isAdmin = false;
            this.showEmailSettings = true;
            this.multiselectMulti = "single";
            this.isSavingUser = false;
            this.isLoading = false;
            this.isLoadingSettings = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ManageResidentsController.prototype.$onInit = function () {
            this.isAdmin = this.siteInfo.userInfo.isAdmin;
            this.siteLaunchedDateUtc = this.siteInfo.privateSiteInfo.siteLaunchedDateUtc;
            this.bulkImportRows = [{}];
            this.multiselectOptions = "";
            this.allUnits = null;
            this.homeName = AppConfig.homeName || "Unit";
            this.showIsRenter = AppConfig.appShortName === "condo" || AppConfig.appShortName === "hoa";
            this.showEmailSettings = !this.siteInfo.privateSiteInfo.isLargeGroup;
            this.boardPositions = [
                { id: 0, name: "None" },
                { id: 1, name: "President" },
                { id: 2, name: "Treasurer" },
                { id: 4, name: "Secretary" },
                { id: 8, name: "Director/Trustee" },
                { id: 16, name: "Vice President" },
                { id: 32, name: "Property Manager" }
            ];
            this.newResident = {
                boardPosition: 0,
                isRenter: false
            };
            this.editUser = null;
            var LocalKey_ResidentSort = "residentSort_v2";
            var defaultSort = { field: "lastName", direction: this.uiGridConstants.ASC };
            this.residentSortInfo = defaultSort;
            if (window.localStorage) {
                var sortOptions = window.localStorage.getItem(LocalKey_ResidentSort);
                if (sortOptions)
                    this.residentSortInfo = JSON.parse(sortOptions);
                if (!this.residentSortInfo.field)
                    this.residentSortInfo = defaultSort;
            }
            var innerThis = this;
            this.residentGridOptions =
                {
                    data: [],
                    columnDefs: [
                        { field: 'firstName', displayName: 'First Name', cellClass: "resident-cell-first" },
                        { field: 'lastName', displayName: 'Last Name', cellClass: "resident-cell-last" },
                        { field: 'email', displayName: 'E-mail', cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text class="resident-cell-email" data-ng-style="{ \'color\': row.entity.postmarkReportedBadEmailUtc ? \'#F00\' : \'auto\' }">{{ row.entity.email }}</span></div>' },
                        { field: 'unitGridLabel', displayName: AppConfig.appShortName === 'condo' ? 'Unit' : 'Home', cellClass: "resident-cell-unit", width: this.showIsRenter ? 62 : 175, sortingAlgorithm: function (a, b) { return a.toString().localeCompare(b.toString()); } },
                        { field: 'isRenter', displayName: 'Is Renter', width: 80, cellClass: "resident-cell-is-renter", visible: this.showIsRenter, cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isRenter"></div>' },
                        { field: 'boardPosition', displayName: 'Board Position', width: 125, cellClass: "resident-cell-board", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ grid.appScope.$ctrl.getBoardPositionName(row.entity.boardPosition) }}</span></div>' },
                        { field: 'isSiteManager', displayName: 'Is Admin', width: 80, cellClass: "resident-cell-site-manager", cellTemplate: '<div class="ui-grid-cell-contents" style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" data-ng-checked="row.entity.isSiteManager"></div>' },
                        { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()"><span ng-cell-text>{{ row.entity.phoneNumber | tel }}</span></div>' },
                    ],
                    multiSelect: false,
                    enableSorting: true,
                    enableHorizontalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableVerticalScrollbar: this.uiGridConstants.scrollbars.NEVER,
                    enableFullRowSelection: true,
                    enableColumnMenus: false,
                    enableRowHeaderSelection: false,
                    onRegisterApi: function (gridApi) {
                        innerThis.gridApi = gridApi;
                        gridApi.selection.on.rowSelectionChanged(innerThis.$rootScope, function (row) {
                            var msg = 'row selected ' + row.isSelected;
                            innerThis.setEdit(row.entity);
                        });
                        gridApi.core.on.sortChanged(innerThis.$rootScope, function (grid, sortColumns) {
                            if (!sortColumns || sortColumns.length === 0)
                                return;
                            // Remember the sort
                            var simpleSortInfo = { field: sortColumns[0].field, direction: sortColumns[0].sort.direction };
                            window.localStorage.setItem(LocalKey_ResidentSort, JSON.stringify(simpleSortInfo));
                        });
                        // Fix dumb scrolling
                        HtmlUtil.uiGridFixScroll();
                    }
                };
            if (window.innerWidth < 769) {
                for (var i = 2; i < this.residentGridOptions.columnDefs.length; ++i)
                    this.residentGridOptions.columnDefs[i].visible = false;
            }
            this.refresh();
            this.loadSettings();
        };
        ManageResidentsController.prototype.getBoardPositionName = function (boardValue) {
            if (!boardValue)
                return "";
            var boardPosition = jQuery.grep(this.boardPositions, function (pos, i) { return pos.id === boardValue; })[0];
            if (!boardPosition)
                return "";
            return boardPosition.name;
        };
        /**
        * Edit a resident's information
        */
        ManageResidentsController.prototype.setEdit = function (resident) {
            this.sentWelcomeEmail = false;
            if (resident === null) {
                this.editUser = null;
                return;
            }
            this.editUserForm.$setPristine();
            var copiedUser = jQuery.extend({}, resident);
            this.editUser = copiedUser;
            // Initialize the home picker state
            this.editUser.showAdvancedHomePicker = this.allUnits.length > 20;
            this.multiselectMulti = "single";
            if (typeof (this.editUser.units) === "object") {
                if (this.editUser.units.length > 0)
                    this.editUser.singleUnitId = this.editUser.units[0].unitId;
                if (this.editUser.units.length > 1) {
                    this.editUser.showAdvancedHomePicker = true;
                    this.multiselectMulti = "multiple";
                }
            }
            // Add an empty unit option for the advanced picker in single-select mode
            if (this.allUnits.length > 20 && this.multiselectMulti === "single") {
                // Add an empty entry since the multi-select control doesn't allow deselection
                if (this.allUnits[0].unitId !== null) {
                    var emptyUnit = new Ally.Unit();
                    emptyUnit.name = "None Selected";
                    this.allUnits.unshift(emptyUnit);
                }
            }
            // Set the selected units
            var innerThis = this;
            _.each(this.allUnits, function (allUnit) {
                var isSelected = _.find(innerThis.editUser.units, function (userUnit) { return userUnit.unitId === allUnit.unitId; }) !== undefined;
                allUnit.isSelectedForEditUser = isSelected;
            });
            //this.residentGridOptions.selectAll( false );
            this.gridApi.selection.clearSelectedRows();
            setTimeout("$( '#edit-user-first-text-box' ).focus();", 100);
        };
        /**
         * Send a resident the welcome e-mail
         */
        ManageResidentsController.prototype.onSendWelcome = function () {
            this.isSavingUser = true;
            var innerThis = this;
            this.$http.put("/api/Residents/" + this.editUser.userId + "/SendWelcome", null).success(function () {
                innerThis.isSavingUser = false;
                innerThis.sentWelcomeEmail = true;
            }).error(function () {
                innerThis.isSavingUser = false;
                alert("Failed to send the welcome e-mail, please contact support if this problem persists.");
            });
        };
        /**
         * Populate the text that is shown for the unit column in the resident grid
         */
        ManageResidentsController.prototype.populateGridUnitLabels = function () {
            // Populate the unit names for the grid
            _.each(this.residentGridOptions.data, function (res) {
                var unitLabel = _.reduce(res.units, function (memo, u) {
                    if (memo.length > 0)
                        return memo + "," + u.name;
                    else
                        return u.name;
                }, "");
                res.unitGridLabel = unitLabel;
            });
        };
        /**
         * Populate the residents
         */
        ManageResidentsController.prototype.refresh = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Residents").success(function (residentArray) {
                innerThis.isLoading = false;
                innerThis.residentGridOptions.data = residentArray;
                innerThis.residentGridOptions.minRowsToShow = residentArray.length;
                innerThis.residentGridOptions.virtualizationThreshold = residentArray.length;
                innerThis.hasOneAdmin = _.filter(residentArray, function (r) { return r.isSiteManager; }).length === 1 && residentArray.length > 1;
                //this.gridApi.grid.notifyDataChange( uiGridConstants.dataChange.ALL );
                // If we have sort info to use
                if (innerThis.residentSortInfo) {
                    var sortColumn = _.find(innerThis.gridApi.grid.columns, function (col) { return col.field === innerThis.residentSortInfo.field; });
                    if (sortColumn)
                        innerThis.gridApi.grid.sortColumn(sortColumn, innerThis.residentSortInfo.direction, false);
                }
                // Build the full name and convert the last login to local time
                _.forEach(residentArray, function (res) {
                    res.fullName = res.firstName + " " + res.lastName;
                    if (typeof (res.email) === "string" && res.email.indexOf("@condoally.com") !== -1)
                        res.email = "";
                    // Convert the last login timestamps to local time
                    if (res.lastLoginDateUtc)
                        res.lastLoginDateUtc = moment.utc(res.lastLoginDateUtc).toDate();
                });
                innerThis.populateGridUnitLabels();
                if (!innerThis.allUnits) {
                    innerThis.isLoading = true;
                    innerThis.$http.get("/api/Unit").then(function (httpResponse) {
                        innerThis.isLoading = false;
                        innerThis.allUnits = httpResponse.data;
                        // If we have a lot of units then allow searching
                        innerThis.multiselectOptions = innerThis.allUnits.length > 20 ? "filter" : "";
                    }, function () {
                        innerThis.isLoading = false;
                        alert("Failed to retrieve your association's home listing, please contact support.");
                    });
                }
            });
        };
        /**
         * Occurs when the user presses the button to allow multiple home selections
         */
        ManageResidentsController.prototype.enableMultiHomePicker = function () {
            if (this.editUser)
                this.editUser.showAdvancedHomePicker = true;
            this.multiselectMulti = 'multiple';
            if (this.allUnits && this.allUnits.length > 0 && this.allUnits[0].unitId === null)
                this.allUnits.shift();
        };
        /**
         * Occurs when the user presses the button to update a resident's information or create a new
         * resident
         */
        ManageResidentsController.prototype.onSaveResident = function () {
            if (!this.editUser)
                return;
            $("#editUserForm").validate();
            if (!$("#editUserForm").valid())
                return;
            // If the logged-in user is editing their own user
            if (this.editUser.userId === this.$rootScope.userInfo.userId) {
                // If the user is removing their ability to manage the site
                if (this.siteInfo.userInfo.isSiteManager && !this.editUser.isSiteManager) {
                    if (!confirm("If you remove yourself as a site admin you won't be able to continue making changes. Are you sure you want to remove yourself as a site admin?"))
                        return;
                }
            }
            // Map the UI entry of units to the type expected on the server
            if (!this.editUser.showAdvancedHomePicker)
                this.editUser.units = [{ unitId: this.editUser.singleUnitId }];
            this.isSavingUser = true;
            var innerThis = this;
            var onSave = function (response) {
                innerThis.isSavingUser = false;
                if (typeof (response.data.errorMessage) === "string") {
                    alert("Failed to add resident: " + response.data.errorMessage);
                    return;
                }
                innerThis.editUser = null;
                innerThis.refresh();
            };
            var isAddingNew = false;
            var onError = function (response) {
                innerThis.isSavingUser = false;
                var errorMessage = isAddingNew ? "Failed to add new resident" : "Failed to update resident";
                if (response && response.data && response.data.exceptionMessage)
                    errorMessage += ": " + response.data.exceptionMessage;
                alert(errorMessage);
            };
            // If we don't have a user ID then that means this is a new resident
            if (!this.editUser.userId) {
                isAddingNew = true;
                analytics.track("addNewResident");
                this.$http.post("/api/Residents", this.editUser).then(onSave, onError);
            }
            else {
                isAddingNew = false;
                analytics.track("editResident");
                this.$http.put("/api/Residents", this.editUser).then(onSave, onError);
            }
            // Update the fellow residents page next time we're there
            this.fellowResidents.clearResidentCache();
        };
        /**
         * Occurs when the user presses the button to set a user's password
         */
        ManageResidentsController.prototype.OnAdminSetPassword = function () {
            var setPass = {
                userName: this.adminSetPass_Username,
                password: this.adminSetPass_Password
            };
            var innerThis = this;
            this.$http.post("/api/AdminHelper/SetPassword", setPass).success(function (resultMessage) {
                innerThis.adminSetPass_ResultMessage = resultMessage;
            }).error(function (data) {
                var errorMessage = data.exceptionMessage ? data.exceptionMessage : data;
                alert("Failed to set password: " + errorMessage);
            });
        };
        /**
         * Load the resident settings
         */
        ManageResidentsController.prototype.loadSettings = function () {
            var _this = this;
            this.isLoadingSettings = true;
            var innerThis = this;
            this.$http.get("/api/Settings").success(function (data) {
                innerThis.isLoadingSettings = false;
                _this.residentSettings = data;
            }).error(function (exc) {
                innerThis.isLoadingSettings = false;
                console.log("Failed to retrieve settings");
            });
        };
        /**
         * Export the resident list as a CSV
         */
        ManageResidentsController.prototype.exportResidentCsv = function () {
            if (typeof (analytics) !== "undefined")
                analytics.track('exportResidentCsv');
            var csvColumns = [
                {
                    headerText: "First Name",
                    fieldName: "firstName"
                },
                {
                    headerText: "Last Name",
                    fieldName: "lastName"
                },
                {
                    headerText: "Phone",
                    fieldName: "phoneNumber"
                },
                {
                    headerText: "E-mail",
                    fieldName: "email"
                },
                {
                    headerText: "Unit",
                    fieldName: "unitGridLabel"
                },
                {
                    headerText: "Is Renter",
                    fieldName: "isRenter"
                },
                {
                    headerText: "Is Admin",
                    fieldName: "isSiteManager"
                },
                {
                    headerText: "Board Position",
                    fieldName: "boardPosition",
                    dataMapper: function (value) {
                        return this.getBoardPositionName(value);
                    }
                },
                {
                    headerText: "Last Login Date",
                    fieldName: "lastLoginDateUtc",
                    dataMapper: function (value) {
                        if (!value)
                            return "Has not logged-in";
                        return moment(value).format("YYYY-MM-DD HH:mm:00");
                    }
                }
            ];
            var csvDataString = Ally.createCsvString(this.residentGridOptions.data, csvColumns);
            csvDataString = "data:text/csv;charset=utf-8," + csvDataString;
            var encodedUri = encodeURI(csvDataString);
            // Works, but can't set the file name
            //window.open( encodedUri );
            var csvLink = document.createElement("a");
            csvLink.setAttribute("href", encodedUri);
            csvLink.setAttribute("download", "Residents.csv");
            document.body.appendChild(csvLink); // Required for FF
            csvLink.click(); // This will download the data file named "my_data.csv"
            setTimeout(function () { document.body.removeChild(csvLink); }, 500);
        };
        /**
         * Save the resident settings to the server
         */
        ManageResidentsController.prototype.saveResidentSettings = function () {
            analytics.track("editResidentSettings");
            this.isLoadingSettings = true;
            var innerThis = this;
            this.$http.put("/api/Settings", this.residentSettings).success(function () {
                innerThis.isLoadingSettings = false;
                // Update the fellow residents page next time we're there
                innerThis.fellowResidents.clearResidentCache();
                innerThis.siteInfo.privateSiteInfo.canHideContactInfo = innerThis.residentSettings.canHideContactInfo;
            }).error(function () {
                innerThis.isLoadingSettings = false;
                alert("Failed to update settings, please try again or contact support.");
            });
        };
        /**
         * Occurs when the user presses the button to delete a resident
         */
        ManageResidentsController.prototype.onDeleteResident = function () {
            if (!confirm("Are you sure you want to remove this person from your building?"))
                return;
            if (this.siteInfo.userInfo.userId === this.editUser.userId) {
                if (!confirm("If you remove your own account you won't be able to login anymore. Are you still sure?"))
                    return;
            }
            this.isSavingUser = true;
            var innerThis = this;
            this.$http.delete("/api/Residents?userId=" + this.editUser.userId).success(function () {
                innerThis.isSavingUser = false;
                innerThis.editUser = null;
                // Update the fellow residents page next time we're there
                innerThis.fellowResidents.clearResidentCache();
                innerThis.refresh();
            }).error(function () {
                alert("Failed to remove the resident. Please let support know if this continues to happen.");
                innerThis.isSavingUser = false;
                innerThis.editUser = null;
            });
        };
        /**
         * Occurs when the user presses the button to reset everyone's password
         */
        ManageResidentsController.prototype.onSendAllWelcome = function () {
            if (!confirm("This will e-mail all of the residents in your association. Do you want to proceed?"))
                return;
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/Residents?userId&action=launchsite", null).success(function (data) {
                innerThis.isLoading = false;
                innerThis.sentWelcomeEmail = true;
                innerThis.allEmailsSent = true;
            }).error(function () {
                innerThis.isLoading = false;
                alert("Failed to send welcome e-mail, please contact support if this problem persists.");
            });
        };
        /**
         * Parse the bulk resident CSV text
         */
        ManageResidentsController.prototype.parseBulkCsv = function () {
            var csvParser = $.csv;
            var bulkRows = csvParser.toArrays(this.bulkImportCsv);
            this.bulkImportRows = [];
            var simplifyStreetName = function (streetAddress) {
                if (!streetAddress)
                    streetAddress = "";
                var simplifiedName = streetAddress.toLowerCase();
                simplifiedName = simplifiedName.replace(/0th /g, "0 ").replace(/1st /g, "1 ");
                simplifiedName = simplifiedName.replace(/2nd /g, "2 ").replace(/3rd /g, "3 ");
                simplifiedName = simplifiedName.replace(/4th /g, "4 ").replace(/5th /g, "5 ");
                simplifiedName = simplifiedName.replace(/6th /g, "6 ").replace(/7th /g, "7 ");
                simplifiedName = simplifiedName.replace(/8th /g, "8 ").replace(/9th /g, "9 ");
                simplifiedName = simplifiedName.replace(/\./g, "").replace(/ /g, "");
                simplifiedName = simplifiedName.replace(/street/g, "st").replace(/road/g, "rd").replace(/drive/g, "dr");
                simplifiedName = simplifiedName.replace(/place/g, "pl").replace(/avenue/g, "ave");
                return simplifiedName;
            };
            for (var i = 0; i < this.allUnits.length; ++i)
                this.allUnits[i].csvTestName = simplifyStreetName(this.allUnits[i].name);
            for (var i = 0; i < bulkRows.length; ++i) {
                var curRow = bulkRows[i];
                while (curRow.length < 7)
                    curRow.push("");
                // Clean up the data
                for (var j = 0; j < curRow.length; ++j) {
                    if (HtmlUtil.isNullOrWhitespace(curRow[j]))
                        curRow[j] = null;
                    else
                        curRow[j] = curRow[j].trim();
                }
                var newRow = {
                    unitName: curRow[0] || null,
                    unitId: undefined,
                    email: curRow[1],
                    firstName: curRow[2],
                    lastName: curRow[3],
                    phoneNumber: curRow[4],
                    isRenter: !HtmlUtil.isNullOrWhitespace(curRow[5]),
                    isAdmin: !HtmlUtil.isNullOrWhitespace(curRow[6]),
                    csvTestName: ""
                };
                if (HtmlUtil.isNullOrWhitespace(newRow.unitName))
                    newRow.unitId = null;
                else {
                    newRow.csvTestName = simplifyStreetName(newRow.unitName);
                    var unit = _.find(this.allUnits, function (u) { return u.csvTestName === newRow.csvTestName; });
                    if (unit)
                        newRow.unitId = unit.unitId;
                    else
                        newRow.unitId = undefined;
                }
                this.bulkImportRows.push(newRow);
            }
        };
        /**
         * Submit the bulk creation rows to the server
         */
        ManageResidentsController.prototype.submitBulkRows = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/Residents/BulkLoad", this.bulkImportRows).success(function () {
                innerThis.isLoading = false;
                innerThis.bulkImportRows = [{}];
                innerThis.bulkImportCsv = "";
                alert("Success");
            }).error(function () {
                innerThis.isLoading = false;
                alert("Bulk upload failed");
            });
        };
        /**
         * Add a row to the bulk table
         */
        ManageResidentsController.prototype.addBulkRow = function () {
            var newRow = {
                unitName: "",
                unitId: null,
                email: "",
                firstName: "",
                lastName: "",
                phoneNumber: "",
                isRenter: false,
                isAdmin: false
            };
            // Try to step to the next unit
            if (this.bulkImportRows.length > 0) {
                var lastUnitId = this.bulkImportRows[this.bulkImportRows.length - 1].unitId;
                var lastUnitIndex = _.findIndex(this.allUnits, function (u) { return u.unitId === lastUnitId; });
                ++lastUnitIndex;
                if (lastUnitIndex < this.allUnits.length) {
                    newRow.unitName = this.allUnits[lastUnitIndex].name;
                    newRow.unitId = this.allUnits[lastUnitIndex].unitId;
                }
            }
            this.bulkImportRows.push(newRow);
        };
        ManageResidentsController.$inject = ["$http", "$rootScope", "$interval", "fellowResidents", "uiGridConstants", "SiteInfo"];
        return ManageResidentsController;
    }());
    Ally.ManageResidentsController = ManageResidentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("manageResidents", {
    templateUrl: "/ngApp/chtn/manager/manage-residents.html",
    controller: Ally.ManageResidentsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page to view group site settings
     */
    var ChtnSettingsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ChtnSettingsController($http, siteInfo, $timeout, $scope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        ChtnSettingsController.prototype.$onInit = function () {
            this.settings = {};
            this.defaultBGImage = $(document.documentElement).css("background-image");
            this.showQaButton = this.siteInfo.userInfo.emailAddress === "president@mycondoally.com";
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            // Hook up the file upload control after everything is loaded and setup
            var innerThis = this;
            this.$timeout(function () { return innerThis.hookUpFileUpload(); }, 200);
            this.refreshData();
        };
        /**
         * Populate the page from the server
         */
        ChtnSettingsController.prototype.refreshData = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Settings").then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.settings = httpResponse.data;
            });
        };
        /**
         * Clear the login image
         */
        ChtnSettingsController.prototype.removeLoginImage = function () {
            analytics.track("clearLoginImage");
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Settings/ClearLoginImage").then(function () {
                innerThis.isLoading = false;
                innerThis.siteInfo.publicSiteInfo.loginImageUrl = "";
                innerThis.loginImageUrl = "";
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to remove loading image: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Save all of the settings
         */
        ChtnSettingsController.prototype.saveSettings = function (shouldReload) {
            if (shouldReload === void 0) { shouldReload = false; }
            analytics.track("editSettings");
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/Settings", this.settings).then(function () {
                innerThis.isLoading = false;
                innerThis.siteInfo.privateSiteInfo.homeRightColumnType = innerThis.settings.homeRightColumnType;
                // Reload the page to show the page title has changed
                if (shouldReload)
                    location.reload();
            });
        };
        /**
         * Occurs when the user wants to save a new site title
         */
        ChtnSettingsController.prototype.onSiteTitleChange = function () {
            analytics.track("editSiteTitle");
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/Settings", { siteTitle: this.settings.siteTitle }).then(function () {
                // Reload the page to show the page title has changed
                location.reload();
            });
        };
        /**
         * Occurs when the user wants to save a new welcome message
         */
        ChtnSettingsController.prototype.onWelcomeMessageUpdate = function () {
            analytics.track("editWelcomeMessage");
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/Settings", { welcomeMessage: this.settings.welcomeMessage }).then(function () {
                innerThis.isLoading = false;
                innerThis.siteInfo.privateSiteInfo.welcomeMessage = innerThis.settings.welcomeMessage;
            });
        };
        /**
         * Occurs when the user clicks a new background image
         */
        ChtnSettingsController.prototype.onImageClick = function (bgImage) {
            this.settings.bgImageFileName = bgImage;
            //SettingsJS._defaultBG = bgImage;
            var innerThis = this;
            this.$http.put("/api/Settings", { BGImageFileName: this.settings.bgImageFileName }).then(function () {
                $(".test-bg-image").removeClass("test-bg-image-selected");
                //$( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );
                innerThis.isLoading = false;
            });
        };
        ChtnSettingsController.prototype.onImageHoverOver = function (bgImage) {
            //$( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + bgImage + ")" );
        };
        ChtnSettingsController.prototype.onImageHoverOut = function () {
            //if( typeof ( this.settings.bgImageFileName ) === "string" && this.settings.bgImageFileName.length > 0 )
            //    $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + this.settings.bgImageFileName + ")" );
            //else
            //    $( document.documentElement ).css( "background-image", this.defaultBGImage );
        };
        ChtnSettingsController.prototype.onQaDeleteSite = function () {
            this.$http.get("/api/QA/DeleteThisAssociation").then(function () {
                location.reload();
            }, function (httpResponse) {
                alert("Failed to delete site: " + httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Hooked up the login image JQuery upload control
         */
        ChtnSettingsController.prototype.hookUpFileUpload = function () {
            var innerThis = this;
            $(function () {
                $('#JQFileUploader').fileupload({
                    autoUpload: true,
                    add: function (e, data) {
                        innerThis.$scope.$apply(function () {
                            this.isLoading = true;
                        });
                        analytics.track("setLoginImage");
                        $("#FileUploadProgressContainer").show();
                        data.url = "api/DocumentUpload/LoginImage?ApiAuthToken=" + innerThis.siteInfo.authToken;
                        var xhr = data.submit();
                        xhr.done(function (result) {
                            innerThis.$scope.$apply(function () {
                                innerThis.isLoading = false;
                                innerThis.loginImageUrl = result.newUrl + "?cacheBreaker=" + new Date().getTime();
                                innerThis.siteInfo.publicSiteInfo.loginImageUrl = this.loginImageUrl;
                            });
                            $("#FileUploadProgressContainer").hide();
                        });
                    },
                    progressall: function (e, data) {
                        var progress = Math.floor((data.loaded * 100) / data.total);
                        $('#FileUploadProgressBar').css('width', progress + '%');
                        if (progress === 100)
                            $("#FileUploadProgressLabel").text("Finalizing Upload...");
                        else
                            $("#FileUploadProgressLabel").text(progress + "%");
                    }
                });
            });
        };
        ChtnSettingsController.$inject = ["$http", "SiteInfo", "$timeout", "$scope"];
        return ChtnSettingsController;
    }());
    Ally.ChtnSettingsController = ChtnSettingsController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnSettings", {
    templateUrl: "/ngApp/chtn/manager/settings.html",
    controller: Ally.ChtnSettingsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page used to navigate to other group info pages
     */
    var AssociationInfoController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function AssociationInfoController(siteInfo) {
            this.siteInfo = siteInfo;
            this.hideDocuments = false;
            this.hideVendors = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        AssociationInfoController.prototype.$onInit = function () {
            this.hideDocuments = this.siteInfo.userInfo.isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.hideVendors = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club";
            if (this.hideDocuments)
                this.selectedView = "info";
            else
                this.selectedView = "docs";
        };
        AssociationInfoController.$inject = ["SiteInfo"];
        return AssociationInfoController;
    }());
    Ally.AssociationInfoController = AssociationInfoController;
})(Ally || (Ally = {}));
CA.condoAllyControllers.
    directive('contenteditable', ['$sce', function ($sce) {
        return {
            restrict: 'A',
            require: '?ngModel',
            link: function (scope, element, attrs, ngModel) {
                if (!ngModel)
                    return; // do nothing if no ng-model
                // Specify how UI should be updated
                ngModel.$render = function () {
                    element.html($sce.getTrustedHtml(ngModel.$viewValue || ''));
                };
                // Listen for change events to enable binding
                element.on('blur keyup change', function () {
                    scope.$evalAsync(read);
                });
                read(); // initialize
                // Write data to the model
                function read() {
                    var html = element.html();
                    // When we clear the content editable the browser leaves a <br> behind
                    // If strip-br attribute is provided then we strip this out
                    if (attrs.stripBr && html === "<br>") {
                        html = '';
                    }
                    ngModel.$setViewValue(html);
                }
            }
        };
    }]);
// Highlight text that matches a string
CA.angularApp.filter("highlight", ["$sce", function ($sce) {
        return function (text, phrase) {
            text = text || "";
            if (phrase)
                text = text.replace(new RegExp('(' + phrase + ')', 'gi'), '<span class="fileSearchHighlight">$1</span>');
            return $sce.trustAsHtml(text);
        };
    }]);
CA.angularApp.component("associationInfo", {
    templateUrl: "/ngApp/chtn/member/association-info.html",
    controller: Ally.AssociationInfoController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the group site home page
     */
    var ChtnHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ChtnHomeController($http, $rootScope, siteInfo, $timeout, $scope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$scope = $scope;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ChtnHomeController.prototype.$onInit = function () {
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.canMakePayment = this.siteInfo.privateSiteInfo.isPaymentEnabled && !this.siteInfo.userInfo.isRenter;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.allyAppName = AppConfig.appName;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType)
                this.homeRightColumnType = "localnews";
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            var innerThis = this;
            this.$scope.$on("homeHasActivePolls", function () { return innerThis.shouldShowAlertSection = true; });
        };
        ChtnHomeController.prototype.hideFirstVisit = function () {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        };
        ChtnHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "$scope"];
        return ChtnHomeController;
    }());
    Ally.ChtnHomeController = ChtnHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnHome", {
    templateUrl: "/ngApp/chtn/member/chtn-home.html",
    controller: Ally.ChtnHomeController
});

var Ally;
(function (Ally) {
    var WelcomeTip = /** @class */ (function () {
        function WelcomeTip() {
        }
        return WelcomeTip;
    }());
    /**
     * The controller for the page that shows useful info on a map
     */
    var ChtnMapController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ChtnMapController($scope, $timeout, $http, siteInfo) {
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.editingTip = new WelcomeTip();
            this.hoaHomes = [];
            this.tips = [];
            this.isLoading = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ChtnMapController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            // If we know our group's position, let's tighten the 
            var autocompleteOptions = undefined;
            if (this.siteInfo.privateSiteInfo.googleGpsPosition) {
                var TwentyFiveMilesInMeters = 40234;
                var latLon = {
                    lat: 41.142248,
                    lng: -73.633228
                };
                var circle = new google.maps.Circle({
                    center: this.siteInfo.privateSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            var addressInput = document.getElementById("edit-location-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            var innerThis = this;
            google.maps.event.addListener(this.addressAutocomplete, 'place_changed', function () {
                var place = innerThis.addressAutocomplete.getPlace();
                innerThis.editingTip.address = place.formatted_address;
            });
            if (AppConfig.appShortName === "hoa")
                this.retrieveHoaHomes();
            else
                this.refresh();
            var innerThis = this;
            this.$timeout(function () { return innerThis.getWalkScore(); }, 1000);
            MapCtrlMapMgr.Init(this.siteInfo, this.$scope, this);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.refresh = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/WelcomeTip").then(function (httpResponse) {
                innerThis.tips = httpResponse.data;
                MapCtrlMapMgr.ClearAllMarkers();
                if (AppConfig.appShortName === "condo")
                    MapCtrlMapMgr.AddMarker(MapCtrlMapMgr._homeGpsPos.lat(), MapCtrlMapMgr._homeGpsPos.lng(), "Home", MapCtrlMapMgr.MarkerNumber_Home);
                for (var locationIndex = 0; locationIndex < innerThis.tips.length; ++locationIndex) {
                    var curLocation = innerThis.tips[locationIndex];
                    if (curLocation.gpsPos === null)
                        continue;
                    curLocation.markerIndex = MapCtrlMapMgr.AddMarker(curLocation.gpsPos.lat, curLocation.gpsPos.lon, curLocation.name, curLocation.markerNumber);
                }
                // Add HOA homes
                _.each(innerThis.hoaHomes, function (home) {
                    if (home.fullAddress && home.fullAddress.gpsPos) {
                        MapCtrlMapMgr.AddMarker(home.fullAddress.gpsPos.lat, home.fullAddress.gpsPos.lon, home.name, MapCtrlMapMgr.MarkerNumber_Home);
                    }
                });
                MapCtrlMapMgr.OnMarkersReady();
                innerThis.isLoading = false;
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to edit a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.onEditTip = function (tip) {
            this.editingTip = jQuery.extend({}, tip);
            window.scrollTo(0, document.body.scrollHeight);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to move a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.onMoveMarker = function (tip) {
            MapCtrlMapMgr.SetMarkerDraggable(tip.markerIndex, true);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to delete a tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.onDeleteTip = function (tip) {
            if (!confirm('Are you sure you want to delete this item?'))
                return;
            this.isLoading = true;
            var innerThis = this;
            this.$http.delete("/api/WelcomeTip/" + tip.itemId).then(function () {
                innerThis.isLoading = false;
                innerThis.refresh();
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to add a new tip
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.onSaveTip = function () {
            if (this.editingTip === null)
                return;
            //$( "#new-item-form" ).validate();
            //if ( !$( "#new-item-form" ).valid() )
            //    return;
            var innerThis = this;
            var onSave = function () {
                innerThis.isLoading = false;
                innerThis.editingTip = new WelcomeTip();
                innerThis.refresh();
            };
            this.isLoading = true;
            // If we're editing an existing item
            if (this.editingTip.itemId)
                this.$http.put("/api/WelcomeTip", this.editingTip).then(onSave);
            else
                this.$http.post("/api/WelcomeTip", this.editingTip).then(onSave);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Used by the ng-repeats to filter locations vs tips
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.isLocationTip = function (tip) {
            return tip.gpsPos !== null;
        };
        ChtnMapController.prototype.isNotLocationTip = function (tip) {
            return tip.gpsPos === null;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the URL to the image for a specific marker
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.getMarkerIconUrl = function (markerNumber) {
            var MarkerNumber_Home = -2;
            var MarkerNumber_Hospital = -3;
            var MarkerNumber_PostOffice = -4;
            var retPath = "/assets/images/MapMarkers/";
            if (markerNumber >= 1 && markerNumber <= 10)
                retPath += "green_" + markerNumber;
            else if (markerNumber === MarkerNumber_Home)
                retPath += "MapMarker_Home";
            else if (markerNumber === MarkerNumber_Hospital)
                retPath += "MapMarker_Hospital";
            else if (markerNumber === MarkerNumber_PostOffice)
                retPath += "MapMarker_PostOffice";
            retPath += ".png";
            return retPath;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Move a marker's position
        ///////////////////////////////////////////////////////////////////////////////////////////////
        ChtnMapController.prototype.updateItemGpsLocation = function (markerIndex, lat, lon) {
            var tip = _.find(this.tips, function (t) { return t.markerIndex === markerIndex; });
            var updateInfo = {
                itemId: tip.itemId,
                newLat: lat,
                newLon: lon
            };
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/WelcomeTip/UpdateGpsLocation", updateInfo).then(function () {
                innerThis.isLoading = false;
            });
        };
        /**
         * Set the walkscore info
         */
        ChtnMapController.prototype.getWalkScore = function () {
            var handleWalkScoreResult = function (httpResponse) {
                if (!httpResponse || !httpResponse.data || httpResponse.data === "Error") {
                    $("#WalkScorePanel").html("Failed to load Walk Score.");
                    $("#WalkScorePanel").hide();
                }
                else
                    $("#WalkScorePanel").html(httpResponse.data);
            };
            this.$http.get("/api/WelcomeTip/GetWalkScore").then(handleWalkScoreResult, handleWalkScoreResult);
        };
        /**
        * Load the houses onto the map
        */
        ChtnMapController.prototype.retrieveHoaHomes = function () {
            var innerThis = this;
            this.$http.get("/api/BuildingResidents/FullUnits").then(function (httpResponse) {
                innerThis.hoaHomes = httpResponse.data;
                innerThis.refresh();
            }, function () {
                innerThis.refresh();
            });
        };
        ChtnMapController.$inject = ["$scope", "$timeout", "$http", "SiteInfo"];
        return ChtnMapController;
    }());
    Ally.ChtnMapController = ChtnMapController;
})(Ally || (Ally = {}));
CA.angularApp.component("chtnMap", {
    templateUrl: "/ngApp/chtn/member/chtn-map.html",
    controller: Ally.ChtnMapController
});
var MapCtrlMapMgr = /** @class */ (function () {
    function MapCtrlMapMgr() {
    }
    /**
    * Called when the DOM structure is ready
    */
    MapCtrlMapMgr.Init = function (siteInfo, scope, mapCtrl) {
        MapCtrlMapMgr.ngScope = scope;
        MapCtrlMapMgr.mapCtrl = mapCtrl;
        if (typeof (google) === "undefined")
            return;
        // Store our home position
        MapCtrlMapMgr._homeGpsPos = siteInfo.privateSiteInfo.googleGpsPosition;
        MapCtrlMapMgr._groupGpsBounds = siteInfo.publicSiteInfo.gpsBounds;
        // Create the map centered at our home
        var myOptions = {
            center: MapCtrlMapMgr._homeGpsPos,
            zoom: 25,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        MapCtrlMapMgr._mainMap = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
        // Add our home marker
        if (AppConfig.appShortName === "condo")
            MapCtrlMapMgr.AddMarker(MapCtrlMapMgr._homeGpsPos.lat(), MapCtrlMapMgr._homeGpsPos.lng(), "Home", MapCtrlMapMgr.MarkerNumber_Home);
        MapCtrlMapMgr.OnMapReady();
        // Add any markers that already exist to this map
        //for( var markerIndex = 0; markerIndex < MapCtrlMapMgr._markers.length; ++markerIndex )
        //{
        //    if( !MapCtrlMapMgr._markers[markerIndex].getMap() )
        //        MapCtrlMapMgr._markers[markerIndex].setMap( MapCtrlMapMgr._mainMap );
        //}
    };
    MapCtrlMapMgr.OnMapReady = function () {
        MapCtrlMapMgr._isMapReady = true;
        if (MapCtrlMapMgr._areMarkersReady)
            MapCtrlMapMgr.OnMapAndMarkersReady();
    };
    MapCtrlMapMgr.OnMarkersReady = function () {
        MapCtrlMapMgr._areMarkersReady = true;
        if (MapCtrlMapMgr._isMapReady)
            MapCtrlMapMgr.OnMapAndMarkersReady();
    };
    MapCtrlMapMgr.OnMapAndMarkersReady = function () {
        for (var markerIndex = 0; markerIndex < MapCtrlMapMgr._tempMarkers.length; ++markerIndex) {
            var tempMarker = MapCtrlMapMgr._tempMarkers[markerIndex];
            var markerImageUrl = null;
            if (tempMarker.markerNumber >= 1 && tempMarker.markerNumber <= 10)
                markerImageUrl = "/assets/images/MapMarkers/green_" + tempMarker.markerNumber + ".png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_Home)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_Home.png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_Hospital)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_Hospital.png";
            else if (tempMarker.markerNumber === MapCtrlMapMgr.MarkerNumber_PostOffice)
                markerImageUrl = "/assets/images/MapMarkers/MapMarker_PostOffice.png";
            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(tempMarker.lat, tempMarker.lon),
                map: MapCtrlMapMgr._mainMap,
                animation: google.maps.Animation.DROP,
                title: tempMarker.name,
                icon: markerImageUrl
            });
            marker.markerIndex = markerIndex;
            google.maps.event.addListener(marker, 'dragend', function () {
                var marker = this;
                var gpsPos = marker.getPosition();
                MapCtrlMapMgr.ngScope.$apply(function () {
                    MapCtrlMapMgr.mapCtrl.updateItemGpsLocation(marker.markerIndex, gpsPos.lat(), gpsPos.lng());
                });
            });
            MapCtrlMapMgr._markers.push(marker);
        }
        // We've processed all of the temp markes so clear the array
        MapCtrlMapMgr._tempMarkers = [];
        if (MapCtrlMapMgr._groupGpsBounds) {
            var groupBoundsPath = Ally.MapUtil.gpsBoundsToGooglePoly(MapCtrlMapMgr._groupGpsBounds);
            var groupBoundsPolylineOptions = {
                paths: groupBoundsPath,
                map: MapCtrlMapMgr._mainMap,
                strokeColor: '#0000FF',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillColor: '#0000FF',
                fillOpacity: 0.15,
                zIndex: -1
            };
            MapCtrlMapMgr._groupBoundsShape = new google.maps.Polygon(groupBoundsPolylineOptions);
        }
        MapCtrlMapMgr.ZoomMapToFitMarkers();
    };
    /**
    * Add a marker to the map
    */
    MapCtrlMapMgr.ClearAllMarkers = function () {
        for (var i = 0; i < MapCtrlMapMgr._markers.length; i++)
            MapCtrlMapMgr._markers[i].setMap(null);
        MapCtrlMapMgr._markers = [];
    };
    /**
    * Make a marker draggable or not
    */
    MapCtrlMapMgr.SetMarkerDraggable = function (markerIndex, isDraggable) {
        MapCtrlMapMgr._markers[markerIndex].setDraggable(isDraggable);
    };
    /**
    * Add a marker to the map and return the index of that new marker
    */
    MapCtrlMapMgr.AddMarker = function (lat, lon, name, markerNumber) {
        MapCtrlMapMgr._tempMarkers.push({
            lat: lat,
            lon: lon,
            name: name,
            markerNumber: markerNumber
        });
        return MapCtrlMapMgr._tempMarkers.length - 1;
    };
    /**
    * Set the map zoom so all markers are visible
    */
    MapCtrlMapMgr.ZoomMapToFitMarkers = function () {
        //  Create a new viewpoint bound
        var bounds = new google.maps.LatLngBounds();
        //  Go through each marker and make the bounds extend to fit it
        for (var markerIndex = 0; markerIndex < MapCtrlMapMgr._markers.length; ++markerIndex)
            bounds.extend(MapCtrlMapMgr._markers[markerIndex].getPosition());
        if (MapCtrlMapMgr._groupBoundsShape) {
            var path = MapCtrlMapMgr._groupBoundsShape.getPath();
            for (var i = 0; i < path.getLength(); ++i)
                bounds.extend(path.getAt(i));
        }
        //  Fit these bounds to the map
        MapCtrlMapMgr._mainMap.fitBounds(bounds);
    };
    //onMapApiLoaded: function ()
    //{
    //    MapCtrlMapMgr.Init();
    //},
    /*
    * The map displaying the area around the building
    * @type {google.maps.Map}
    */
    MapCtrlMapMgr._mainMap = null;
    /*
    * The position of our home building
    * @type {google.maps.LatLng}
    */
    MapCtrlMapMgr._homeGpsPos = null;
    MapCtrlMapMgr._groupGpsBounds = null;
    MapCtrlMapMgr._groupBoundsShape = null;
    /*
    * The array of markers on the map. We keep track in case the map wasn't created yet when
    * AddMarker was called.
    * @type {Array.<google.maps.Marker>}
    */
    MapCtrlMapMgr._markers = [];
    /**
    * The marker number that indicates the home marker icon
    * @type {Number}
    * @const
    */
    MapCtrlMapMgr.MarkerNumber_Home = -2;
    /**
    * The marker number that indicates the hospital marker icon
    * @type {Number}
    * @const
    */
    MapCtrlMapMgr.MarkerNumber_Hospital = -3;
    /**
    * The marker number that indicates the post office marker icon
    * @type {Number}
    * @const
    */
    MapCtrlMapMgr.MarkerNumber_PostOffice = -4;
    MapCtrlMapMgr._isMapReady = false;
    MapCtrlMapMgr._areMarkersReady = false;
    MapCtrlMapMgr._tempMarkers = [];
    MapCtrlMapMgr.ngScope = null;
    MapCtrlMapMgr.mapCtrl = null;
    return MapCtrlMapMgr;
}());

var Ally;
(function (Ally) {
    /**
     * The controller for the page that allows users to reset their password
     */
    var ForgotPasswordController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ForgotPasswordController($http, appCacheService) {
            this.$http = $http;
            this.appCacheService = appCacheService;
            this.isLoading = false;
            this.loginInfo = new Ally.LoginInfo();
            this.shouldHideControls = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        ForgotPasswordController.prototype.$onInit = function () {
            this.loginInfo.emailAddress = this.appCacheService.getAndClear("forgotEmail");
        };
        /**
         * Occurs when the user clicks the log-in button
         */
        ForgotPasswordController.prototype.onSubmitEmail = function () {
            this.isLoading = true;
            // Retrieve information for the current association
            var innerThis = this;
            this.$http.post("/api/Login/Forgot", this.loginInfo).then(function () {
                innerThis.shouldHideControls = true;
                innerThis.isLoading = false;
                innerThis.resultText = "Please check your e-mail for updated login information.";
                innerThis.resultTextColor = "#00F";
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.resultText = "Failed to process your request: " + httpResponse.data;
                innerThis.resultTextColor = "#F00";
            });
        };
        ForgotPasswordController.$inject = ["$http", "appCacheService"];
        return ForgotPasswordController;
    }());
    Ally.ForgotPasswordController = ForgotPasswordController;
})(Ally || (Ally = {}));
CA.angularApp.component("forgotPassword", {
    templateUrl: "/ngApp/chtn/member/forgot-password.html",
    controller: Ally.ForgotPasswordController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page that lists group members
     */
    var GroupMembersController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupMembersController(fellowResidents, siteInfo) {
            this.fellowResidents = fellowResidents;
            this.siteInfo = siteInfo;
            this.isLoading = true;
            this.emailLists = [];
            this.allyAppName = AppConfig.appName;
            this.groupShortName = HtmlUtil.getSubdomain();
            this.showMemberList = AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        GroupMembersController.prototype.$onInit = function () {
            var innerThis = this;
            this.fellowResidents.getByUnitsAndResidents().then(function (data) {
                innerThis.isLoading = false;
                innerThis.unitList = data.byUnit;
                innerThis.allResidents = data.residents;
                // Sort by last name
                innerThis.allResidents = _.sortBy(innerThis.allResidents, function (r) { return r.lastName; });
                innerThis.boardMembers = _.filter(data.residents, function (r) { return r.boardPosition !== 0; });
                innerThis.boardMessageRecipient = null;
                if (innerThis.boardMembers.length > 0) {
                    var hasBoardEmail = _.some(innerThis.boardMembers, function (m) { return m.hasEmail; });
                    if (hasBoardEmail) {
                        innerThis.boardMessageRecipient = {
                            fullName: "Entire Board",
                            firstName: "everyone on the board",
                            hasEmail: true,
                            userId: "af615460-d92f-4878-9dfa-d5e4a9b1f488"
                        };
                    }
                }
                // Remove board members from the member list
                if (AppConfig.appShortName === "neighborhood" || AppConfig.appShortName === "block-club")
                    innerThis.allResidents = _.filter(innerThis.allResidents, function (r) { return r.boardPosition === 0; });
                var boardPositionNames = [
                    { id: 0, name: "None" },
                    { id: 1, name: "President" },
                    { id: 2, name: "Treasurer" },
                    { id: 4, name: "Secretary" },
                    { id: 8, name: "Director" },
                    { id: 16, name: "Vice President" },
                    { id: 32, name: "Property Manager" }
                ];
                for (var i = 0; i < innerThis.boardMembers.length; ++i) {
                    innerThis.boardMembers[i].boardPositionName = _.find(boardPositionNames, function (bm) { return bm.id === innerThis.boardMembers[i].boardPosition; }).name;
                }
                var boardSortOrder = [
                    1,
                    16,
                    2,
                    4,
                    8,
                    32
                ];
                innerThis.boardMembers = _.sortBy(innerThis.boardMembers, function (bm) {
                    var sortIndex = _.indexOf(boardSortOrder, bm.boardPosition);
                    if (sortIndex === -1)
                        sortIndex = 100;
                    return sortIndex;
                });
                var getEmails = function (memo, unit) {
                    Array.prototype.push.apply(memo, unit.owners);
                    return memo;
                };
                innerThis.allOwners = _.reduce(innerThis.unitList, getEmails, []);
                innerThis.allOwners = _.map(_.groupBy(innerThis.allOwners, function (resident) {
                    return resident.email;
                }), function (grouped) {
                    return grouped[0];
                });
                // Remove duplicates
                innerThis.allOwnerEmails = _.reduce(innerThis.allOwners, function (memo, owner) { if (HtmlUtil.isValidString(owner.email)) {
                    memo.push(owner.email);
                } return memo; }, []);
                var useNumericNames = _.every(innerThis.unitList, function (u) { return HtmlUtil.isNumericString(u.name); });
                if (useNumericNames)
                    innerThis.unitList = _.sortBy(innerThis.unitList, function (u) { return +u.name; });
                // Populate the e-mail name lists
                innerThis.setupGroupEmails();
            });
        };
        GroupMembersController.prototype.setupGroupEmails = function () {
            var _this = this;
            this.hasMissingEmails = _.some(this.allResidents, function (r) { return !r.hasEmail; });
            var innerThis = this;
            this.fellowResidents.getGroupEmailObject().then(function (emailLists) {
                _this.emailLists = emailLists;
                // Hook up the address copy link
                setTimeout(function () {
                    var clipboard = new Clipboard(".clipboard-button");
                    var showTooltip = function (element, text) {
                        $(element).qtip({
                            style: {
                                classes: 'qtip-light qtip-shadow'
                            },
                            position: {
                                my: "leftMiddle",
                                at: "rightMiddle"
                            },
                            content: { text: text },
                            events: {
                                hide: function (e) {
                                    $(e.originalEvent.currentTarget).qtip("destroy");
                                }
                            }
                        });
                        $(element).qtip("show");
                    };
                    clipboard.on("success", function (e) {
                        showTooltip(e.trigger, "Copied!");
                        e.clearSelection();
                    });
                    clipboard.on("error", function (e) {
                        showTooltip(e.trigger, "Auto-copy failed, press CTRL+C now");
                    });
                }, 750);
            });
        };
        GroupMembersController.$inject = ["fellowResidents", "SiteInfo"];
        return GroupMembersController;
    }());
    Ally.GroupMembersController = GroupMembersController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupMembers", {
    templateUrl: "/ngApp/chtn/member/group-members.html",
    controller: Ally.GroupMembersController
});

var Ally;
(function (Ally) {
    var HelpSendInfo = /** @class */ (function () {
        function HelpSendInfo() {
        }
        return HelpSendInfo;
    }());
    /**
     * The controller for the page that allows users to submit feedback
     */
    var HelpFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HelpFormController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.sendInfo = new HelpSendInfo();
            this.isLoading = false;
            this.wasMessageSent = false;
            /**
             * Occurs when the user clicks the log-in button
             */
            this.onSendHelp = function () {
                $("#help-form").validate();
                if (!$("#help-form").valid())
                    return;
                this.isLoading = true;
                // Retrieve information for the current association
                var innerThis = this;
                this.$http.post("/api/Help", this.sendInfo).then(function () {
                    innerThis.isLoading = false;
                    innerThis.sendInfo = {};
                    innerThis.wasMessageSent = true;
                    innerThis.resultStyle.color = "#00F";
                    innerThis.sendResult = "Your message has been sent. We'll do our best to get back to you within 24 hours.";
                }, function () {
                    innerThis.isLoading = false;
                    innerThis.resultStyle.color = "#F00";
                    innerThis.sendResult = "Failed to send message.";
                });
            };
            this.resultStyle = {
                "text-align": "center",
                "font-size": "large",
                "font-weight": "bold"
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HelpFormController.prototype.$onInit = function () {
            if (this.siteInfo.isLoggedIn)
                this.sendInfo.emailAddress = this.siteInfo.userInfo.emailAddress;
        };
        HelpFormController.$inject = ["$http", "SiteInfo"];
        return HelpFormController;
    }());
    Ally.HelpFormController = HelpFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("helpForm", {
    templateUrl: "/ngApp/chtn/member/Help.html",
    controller: Ally.HelpFormController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the page that lets users view a calender of events
     */
    var LogbookController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function LogbookController($scope, $timeout, $http, $rootScope, $q, fellowResidents) {
            this.$scope = $scope;
            this.$timeout = $timeout;
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$q = $q;
            this.fellowResidents = fellowResidents;
            this.showBadNotificationDateWarning = false;
            this.isLoadingNews = false;
            this.isLoadingLogbookForCalendar = false;
            this.isLoadingPolls = false;
            this.isLoadingCalendarEvents = false;
            this.onlyRefreshCalendarEvents = false;
            this.showExpandedCalendarEventModel = false;
            ///////////////////////////////////////////////////////////////////////////////////////////////
            // Occurs when the user clicks a user in the calendar event modal
            ///////////////////////////////////////////////////////////////////////////////////////////////
            this.onResidentClicked = function (resident) {
                if (!resident.hasEmail) {
                    alert("That user cannot be included because they do not have an e-mail address on file.");
                    resident.isAssociated = false;
                    return;
                }
                var alreadyExists = _.contains(this.editEvent.associatedUserIds, resident.userId);
                if (alreadyExists)
                    this.editEvent.associatedUserIds = _.without(this.editEvent.associatedUserIds, resident.userId);
                else
                    this.editEvent.associatedUserIds.push(resident.userId);
            };
            ///////////////////////////////////////////////////////////////////////////////////////////////
            // Hide the read-only calendar event view
            ///////////////////////////////////////////////////////////////////////////////////////////////
            this.clearViewEvent = function () {
                this.viewEvent = null;
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LogbookController.prototype.$onInit = function () {
            var innerThis = this;
            this.fellowResidents.getResidents().then(function (residents) {
                innerThis.residents = residents;
                innerThis.residents = _.sortBy(innerThis.residents, function (r) { return r.lastName; });
            });
            /* config object */
            var uiConfig = {
                height: 600,
                editable: false,
                header: {
                    left: 'month agendaWeek',
                    center: 'title',
                    right: 'today prev,next'
                },
                viewRender: function (view, element) {
                    $(element).css("cursor", "pointer");
                },
                dayClick: function (date) {
                    if (!innerThis.$rootScope.isSiteManager)
                        return;
                    // The date is wrong if time zone is considered
                    var clickedDate = moment(moment.utc(date).format(LogbookController.DateFormat)).toDate();
                    innerThis.$scope.$apply(function () {
                        var maxDaysBack = null; //3;
                        //if( moment( clickedDate ).subtract( maxDaysBack, 'day' ).isBefore( moment() ) )
                        //    maxDaysBack = moment( clickedDate ).diff( moment(), 'day' );
                        var eventDetails = {
                            date: clickedDate,
                            dateOnly: clickedDate,
                            associatedUserIds: [],
                            notificationEmailDaysBefore: maxDaysBack
                        };
                        innerThis.setEditEvent(eventDetails, false);
                    });
                },
                eventClick: function (event) {
                    innerThis.$scope.$apply(function () {
                        if (event.calendarEventObject) {
                            if (innerThis.$rootScope.isSiteManager)
                                innerThis.setEditEvent(event.calendarEventObject, true);
                            else
                                innerThis.viewEvent = event.calendarEventObject;
                        }
                    });
                },
                eventRender: function (event, element) {
                    //$( element ).css( "cursor", "default" );
                    $(element).qtip({
                        style: {
                            classes: 'qtip-light qtip-shadow'
                        },
                        content: {
                            text: event.fullDescription,
                            title: event.toolTipTitle
                        }
                    });
                },
                eventSources: [{
                        events: function (start, end, timezone, callback) {
                            innerThis.getAssociationEvents(start, end, timezone, callback);
                        }
                    },
                    {
                        events: function (start, end, timezone, callback) {
                            innerThis.getCalendarEvents(start, end, timezone, callback);
                        }
                    }]
            };
            $(document).ready(function () {
                $('.EditableEntry').editable('<%= Request.Url %>', {
                    id: 'EditEntryId',
                    type: 'textarea',
                    cancel: 'Cancel',
                    submit: 'Ok'
                });
                //$( ".collapsibleContainer" ).collapsiblePanel();
                $('#log-calendar').fullCalendar(uiConfig);
                $('#calendar-event-time').timepicker({ 'scrollDefault': '10:00am' });
                $(".fc-bg td.fc-today").append("<div class='today-note'>Today</div>");
            });
        };
        LogbookController.prototype.getAllEvents = function (startDate, endDate) {
            var loadNewsToCalendar = false;
            var loadLogbookToCalendar = true;
            var loadPollsToCalendar = true;
            //var firstDay = moment().startOf( "month" ).format( DateFormat );
            //var lastDay = moment().add( 1, "month" ).startOf( "month" ).format( DateFormat );
            var firstDay = startDate.format(LogbookController.DateFormat);
            var lastDay = endDate.format(LogbookController.DateFormat);
            var newsDeferred = this.$q.defer();
            var logbookDeferred = this.$q.defer();
            var pollDeferred = this.$q.defer();
            if (loadNewsToCalendar) {
                this.isLoadingNews = true;
                var innerThis = this;
                this.$http.get("/api/News?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    innerThis.isLoadingNews = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        innerThis.calendarEvents.push({
                            title: "Notice: " + shortText,
                            start: entry.postDate.substring(0, 10),
                            toolTipTitle: "Notice Added",
                            fullDescription: fullDescription
                        });
                    });
                    newsDeferred.resolve();
                }, function () {
                    innerThis.isLoadingNews = false;
                    newsDeferred.resolve();
                });
            }
            else
                newsDeferred.resolve();
            if (loadLogbookToCalendar) {
                this.isLoadingLogbookForCalendar = true;
                var innerThis = this;
                this.$http.get("/api/Logbook?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    innerThis.isLoadingLogbookForCalendar = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        innerThis.calendarEvents.push({
                            title: "Logbook: " + shortText,
                            start: entry.postDate.substring(0, 10),
                            toolTipTitle: "Logbook Entry Added",
                            fullDescription: fullDescription
                        });
                    });
                    logbookDeferred.resolve();
                }, function () {
                    innerThis.isLoadingLogbookForCalendar = false;
                    logbookDeferred.resolve();
                });
            }
            if (loadPollsToCalendar) {
                this.isLoadingPolls = true;
                var innerThis = this;
                this.$http.get("/api/Poll?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                    var data = httpResponse.data;
                    innerThis.isLoadingPolls = false;
                    _.each(data, function (entry) {
                        var shortText = entry.text;
                        if (shortText.length > 10)
                            shortText = shortText.substring(0, 10) + "...";
                        var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.text + "</p>";
                        innerThis.calendarEvents.push({
                            title: "Poll: " + shortText,
                            start: entry.postDate.substring(0, 10),
                            toolTipTitle: "Poll Added",
                            fullDescription: fullDescription
                        });
                    });
                    pollDeferred.resolve();
                }, function () {
                    innerThis.isLoadingPolls = false;
                    pollDeferred.resolve();
                });
            }
            return this.$q.all([newsDeferred.promise, logbookDeferred.promise, pollDeferred.promise]);
        };
        LogbookController.prototype.getAssociationEvents = function (start, end, timezone, callback) {
            if (this.onlyRefreshCalendarEvents) {
                this.onlyRefreshCalendarEvents = undefined;
                callback(this.calendarEvents);
                return;
            }
            this.calendarEvents = [];
            var innerThis = this;
            this.getAllEvents(start, end).then(function () {
                callback(innerThis.calendarEvents);
            });
        };
        LogbookController.prototype.getCalendarEvents = function (start, end, timezone, callback) {
            this.isLoadingCalendarEvents = true;
            var firstDay = start.format(LogbookController.DateFormat);
            var lastDay = end.format(LogbookController.DateFormat);
            var innerThis = this;
            this.$http.get("/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay).then(function (httpResponse) {
                var data = httpResponse.data;
                var associationEvents = [];
                innerThis.isLoadingCalendarEvents = false;
                _.each(data, function (entry) {
                    var utcEventDate = moment.utc(entry.eventDateUtc);
                    var utcTimeOnly = utcEventDate.format(LogbookController.TimeFormat);
                    var isAllDay = utcTimeOnly == LogbookController.NoTime;
                    var dateEntry;
                    if (isAllDay) {
                        entry.timeOnly = "";
                        entry.dateOnly = new Date(utcEventDate.year(), utcEventDate.month(), utcEventDate.date());
                        dateEntry = new Date(utcEventDate.year(), utcEventDate.month(), utcEventDate.date());
                    }
                    else {
                        var localDate = moment.utc(entry.eventDateUtc).local();
                        entry.timeOnly = localDate.format(LogbookController.TimeFormat);
                        entry.dateOnly = localDate.clone().startOf('day').toDate();
                        dateEntry = localDate.toDate();
                    }
                    var shortText = entry.title;
                    if (shortText && shortText.length > 10)
                        shortText = shortText.substring(0, 10) + "...";
                    var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.title + "</p>";
                    associationEvents.push({
                        //title: "Event: " + shortText,
                        title: shortText,
                        start: dateEntry,
                        toolTipTitle: "Event",
                        fullDescription: fullDescription,
                        calendarEventObject: entry,
                        allDay: isAllDay
                    });
                });
                callback(associationEvents);
            }, function () {
                innerThis.isLoadingCalendarEvents = false;
            });
        };
        LogbookController.prototype.isUserAssociated = function (userId) {
            if (this.editEvent && this.editEvent.associatedUserIds)
                return _.contains(this.editEvent.associatedUserIds, userId);
            return false;
        };
        LogbookController.prototype.isDateInPast = function (date) {
            var momentDate = moment(date);
            var today = moment();
            return momentDate.isBefore(today, 'day') || momentDate.isSame(today, 'day');
        };
        LogbookController.prototype.onShouldSendChange = function () {
            // Don't allow the user to send remdiner e-mails for past dates
            if (this.editEvent.shouldSendNotification && this.isDateInPast(this.editEvent.dateOnly))
                this.editEvent.shouldSendNotification = false;
        };
        LogbookController.prototype.onChangeEmailDaysBefore = function () {
            var notificationDate = moment(this.editEvent.dateOnly).subtract(this.editEvent.notificationEmailDaysBefore, 'day');
            var today = moment();
            this.showBadNotificationDateWarning = notificationDate.isBefore(today, 'day') || notificationDate.isSame(today, 'day');
            if (this.showBadNotificationDateWarning) {
                this.maxDaysBack = moment(this.editEvent.dateOnly).diff(today, 'day');
                this.editEvent.notificationEmailDaysBefore = this.maxDaysBack;
                var innerThis = this;
                this.$timeout(function () { innerThis.showBadNotificationDateWarning = false; }, 10000);
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Show the full calendar event edit modal
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.expandCalendarEventModel = function () {
            this.showExpandedCalendarEventModel = true;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Set the calendar event for us to edit
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.setEditEvent = function (eventObject, showDetails) {
            this.showExpandedCalendarEventModel = showDetails || false;
            this.editEvent = eventObject;
            // Clear this warning in case the user is clicking around quickly
            this.showBadNotificationDateWarning = false;
            if (this.editEvent) {
                // Simplify the UI logic by transforming this input
                var innerThis = this;
                _.each(this.residents, function (r) { r.isAssociated = innerThis.isUserAssociated(r.userId); });
                this.editEvent.shouldSendNotification = this.editEvent.notificationEmailDaysBefore !== null;
                // Set focus on the title so it's user friendly and ng-escape needs an input focused
                // to work
                setTimeout(function () { $("#calendar-event-title").focus(); }, 10);
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Delete the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.deleteCalendarEvent = function (eventId) {
            if (!confirm("Are you sure you want to remove this event?"))
                return;
            this.isLoadingCalendarEvents = true;
            var innerThis = this;
            this.$http.delete("/api/CalendarEvent?eventId=" + eventId).then(function () {
                innerThis.isLoadingCalendarEvents = false;
                innerThis.editEvent = null;
                innerThis.onlyRefreshCalendarEvents = true;
                $('#log-calendar').fullCalendar('refetchEvents');
            }, function () {
                innerThis.isLoadingCalendarEvents = false;
                alert("Failed to delete the calendar event.");
            });
            ;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Save the calendar event that's being viewed
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LogbookController.prototype.saveCalendarEvent = function () {
            // Build the list of the associated users
            var associatedUsers = _.filter(this.residents, function (r) { return r.isAssociated; });
            this.editEvent.associatedUserIds = _.map(associatedUsers, function (r) { return r.userId; });
            var dateTimeString = "";
            if (typeof (this.editEvent.timeOnly) === "string" && this.editEvent.timeOnly.length > 1) {
                dateTimeString = moment(this.editEvent.dateOnly).format(LogbookController.DateFormat) + " " + this.editEvent.timeOnly;
                this.editEvent.eventDateUtc = moment(dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat).utc().toDate();
            }
            else {
                dateTimeString = moment(this.editEvent.dateOnly).format(LogbookController.DateFormat) + " " + LogbookController.NoTime;
                this.editEvent.eventDateUtc = moment.utc(dateTimeString, LogbookController.DateFormat + " " + LogbookController.TimeFormat).toDate();
            }
            if (!this.editEvent.shouldSendNotification)
                this.editEvent.notificationEmailDaysBefore = null;
            var httpFunc;
            if (this.editEvent.eventId)
                httpFunc = this.$http.put;
            else
                httpFunc = this.$http.post;
            analytics.track("addCalendarEvent");
            this.isLoadingCalendarEvents = true;
            var innerThis = this;
            httpFunc("/api/CalendarEvent", this.editEvent).then(function () {
                innerThis.isLoadingCalendarEvents = false;
                innerThis.editEvent = null;
                innerThis.onlyRefreshCalendarEvents = true;
                $('#log-calendar').fullCalendar('refetchEvents');
            }, function (httpResponse) {
                innerThis.isLoadingCalendarEvents = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to save the calendar event: " + errorMessage);
            });
        };
        ;
        LogbookController.$inject = ["$scope", "$timeout", "$http", "$rootScope", "$q", "fellowResidents"];
        LogbookController.DateFormat = "YYYY-MM-DD";
        LogbookController.TimeFormat = "h:mma";
        LogbookController.NoTime = "12:37am";
        return LogbookController;
    }());
    Ally.LogbookController = LogbookController;
})(Ally || (Ally = {}));
CA.angularApp.component("logbookPage", {
    templateUrl: "/ngApp/chtn/member/logbook.html",
    controller: Ally.LogbookController
});

var Ally;
(function (Ally) {
    var LoginInfo = /** @class */ (function () {
        function LoginInfo() {
            this.emailAddress = "";
            this.password = "";
        }
        return LoginInfo;
    }());
    Ally.LoginInfo = LoginInfo;
    /**
     * The controller for the login page
     */
    var LoginController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function LoginController($http, $rootScope, $location, appCacheService, siteInfo, xdLocalStorage) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$location = $location;
            this.appCacheService = appCacheService;
            this.siteInfo = siteInfo;
            this.xdLocalStorage = xdLocalStorage;
            this.isDemoSite = false;
            this.loginInfo = new LoginInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        LoginController.prototype.$onInit = function () {
            if (!HtmlUtil.isLocalStorageAllowed())
                this.loginResult = "You have cookies/local storage disabled. Condo Ally requires these features, please enable to continue. You may be in private browsing mode.";
            var nav = navigator.userAgent.toLowerCase();
            var ieVersion = (nav.indexOf('msie') != -1) ? parseInt(nav.split('msie')[1]) : 0;
            //var isIEBrowser = window.navigator.userAgent.indexOf( "MSIE " ) >= 0;
            if (ieVersion > 0 && ieVersion < 10)
                document.getElementById("bad-browser-panel").style.display = "block";
            this.isDemoSite = HtmlUtil.getSubdomain() === "demosite";
            // Allow admin to login if needed
            if (HtmlUtil.GetQueryStringParameter("s") === "1")
                this.isDemoSite = false;
            this.loginImageUrl = this.siteInfo.publicSiteInfo.loginImageUrl;
            this.sectionStyle = {
                position: "relative"
            };
            if (!this.isDemoSite) {
                this.sectionStyle["left"] = "50%";
                if (this.loginImageUrl) {
                    this.sectionStyle["width"] = "760px";
                    this.sectionStyle["margin-left"] = "-380px";
                }
                else {
                    this.sectionStyle["width"] = "450px";
                    this.sectionStyle["margin-left"] = "-225px";
                }
            }
            // If we got sent here for a 403, but the user was already logged in
            if (this.appCacheService.getAndClear(this.appCacheService.Key_WasLoggedIn403) === "true") {
                if (this.$rootScope.isSiteManager)
                    this.loginResult = "You are not authorized to perform that action. Please contact support.";
                else
                    this.loginResult = "You are not authorized to perform that action. Please contact an admin.";
            }
            else if (this.appCacheService.getAndClear(this.appCacheService.Key_WasLoggedIn401) === "true")
                this.loginResult = "Please login first.";
            // Focus on the e-mail text box
            setTimeout(function () {
                $("#login-email-textbox").focus();
            }, 200);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button when they forgot their password
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.onForgotPassword = function () {
            this.appCacheService.set("forgotEmail", this.loginInfo.emailAddress);
            this.$location.path("/ForgotPassword");
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Log-in 
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.demoLogin = function () {
            this.loginInfo = {
                emailAddress: "testuser",
                password: "demosite"
            };
            this.onLogin();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the log-in button
        ///////////////////////////////////////////////////////////////////////////////////////////////
        LoginController.prototype.onLogin = function () {
            this.isLoading = true;
            // Retrieve information for the current association
            var innerThis = this;
            this.$http.post("/api/Login", this.loginInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var data = httpResponse.data;
                var redirectPath = innerThis.appCacheService.getAndClear(innerThis.appCacheService.Key_AfterLoginRedirect);
                innerThis.siteInfo.setAuthToken(data.authToken);
                innerThis.siteInfo.handleSiteInfo(data.siteInfo, innerThis.$rootScope);
                if (innerThis.rememberMe) {
                    window.localStorage["rememberMe_Email"] = innerThis.loginInfo.emailAddress;
                    window.localStorage["rememberMe_Password"] = btoa(innerThis.loginInfo.password);
                }
                else {
                    window.localStorage["rememberMe_Email"] = null;
                    window.localStorage["rememberMe_Password"] = null;
                }
                // If the user hasn't accepted the terms yet then make them go to the profile page
                if (data.siteInfo.userInfo.acceptedTermsDate === null && !innerThis.isDemoSite)
                    innerThis.$location.path("/MyProfile");
                else {
                    if (!HtmlUtil.isValidString(redirectPath) && redirectPath !== "/Login")
                        redirectPath = "/Home";
                    innerThis.$location.path(redirectPath);
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                innerThis.loginResult = "Failed to log in: " + errorMessage;
            });
        };
        LoginController.$inject = ["$http", "$rootScope", "$location", "appCacheService", "SiteInfo", "xdLocalStorage"];
        return LoginController;
    }());
    Ally.LoginController = LoginController;
})(Ally || (Ally = {}));
CA.angularApp.component("loginPage", {
    templateUrl: "/ngApp/chtn/member/login.html",
    controller: Ally.LoginController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the profile page
     */
    var MyProfileController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function MyProfileController($rootScope, $http, $location, appCacheService, siteInfo) {
            this.$rootScope = $rootScope;
            this.$http = $http;
            this.$location = $location;
            this.appCacheService = appCacheService;
            this.siteInfo = siteInfo;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        MyProfileController.prototype.$onInit = function () {
            this.isDemoSite = HtmlUtil.getSubdomain() === "demosite";
            if (this.siteInfo.privateSiteInfo)
                this.canHideContactInfo = this.siteInfo.privateSiteInfo.canHideContactInfo;
            this.retrieveItems();
        };
        /**
         * Populate the page
         */
        MyProfileController.prototype.retrieveItems = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/MyProfile").then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.profileInfo = httpResponse.data;
                // Don't show empty e-mail address
                if (HtmlUtil.endsWith(innerThis.profileInfo.email, "@condoally.com"))
                    innerThis.profileInfo.email = "";
                innerThis.needsToAcceptTerms = innerThis.profileInfo.acceptedTermsDate === null && !this.isDemoSite;
                innerThis.hasAcceptedTerms = !innerThis.needsToAcceptTerms; // Gets set by the checkbox
                innerThis.$rootScope.hideMenu = innerThis.needsToAcceptTerms;
                // Was used before, here for covenience
                innerThis.saveButtonStyle = {
                    width: "100px",
                    "font-size": "1em"
                };
            });
        };
        /**
         * Occurs when the user hits the save button
         */
        MyProfileController.prototype.onSaveInfo = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.put("/api/MyProfile", this.profileInfo).then(function () {
                innerThis.resultMessage = "Your changes have been saved.";
                // $rootScope.hideMenu is true when this is the user's first login
                if (innerThis.$rootScope.hideMenu) {
                    innerThis.$rootScope.hideMenu = false;
                    innerThis.$location.path("/Home");
                }
                innerThis.isLoading = false;
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to save: " + httpResponse.data.exceptionMessage);
            });
        };
        MyProfileController.$inject = ["$rootScope", "$http", "$location", "appCacheService", "SiteInfo"];
        return MyProfileController;
    }());
    Ally.MyProfileController = MyProfileController;
})(Ally || (Ally = {}));
CA.angularApp.component("myProfile", {
    templateUrl: "/ngApp/chtn/member/my-profile.html",
    controller: Ally.MyProfileController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var CondoSignUpWizardController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function CondoSignUpWizardController($scope, $http, $timeout, WizardHandler) {
            this.$scope = $scope;
            this.$http = $http;
            this.$timeout = $timeout;
            this.WizardHandler = WizardHandler;
            this.unitNumberingType = "Numbered";
            this.numUnits = 3;
            this.placeWasSelected = false;
            this.shouldCheckAddress = false;
            this.isLoading = false;
            this.map = null;
            this.isLoadingMap = false;
            this.hideWizard = false;
            // The default sign-up info object
            this.signUpInfo = {
                buildings: [{
                        units: []
                    }],
                signerUpInfo: {
                    buildingIndex: 0,
                    boardPositionValue: "1"
                }
            };
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CondoSignUpWizardController.prototype.$onInit = function () {
            var innerThis = this;
            var onReady = function () {
                innerThis.init();
            };
            this.$timeout(onReady, 500);
        };
        /**
         * Occurs when the user changes the number of units
         */
        CondoSignUpWizardController.prototype.onNumUnitsChanged = function () {
            if (!this.numUnits)
                return;
            if (this.numUnits < 1)
                this.numUnits = 1;
            else if (this.numUnits > 100)
                this.numUnits = 100;
            var numNewUnits = this.numUnits - this.signUpInfo.buildings[0].units.length;
            this.signUpInfo.buildings[0].units.length = this.numUnits;
            if (numNewUnits > 0) {
                for (var i = this.numUnits - numNewUnits; i < this.numUnits; ++i) {
                    this.signUpInfo.buildings[0].units[i] = {
                        name: this.getUnitName(i),
                        residents: [{}]
                    };
                }
            }
        };
        ;
        CondoSignUpWizardController.prototype.addResident = function (unit) {
            if (!unit.residents)
                unit.residents = [];
            unit.residents.push({});
        };
        ;
        /**
         * Get the unit name based on its index and the numbering type
         */
        CondoSignUpWizardController.prototype.getUnitName = function (unitIndex) {
            if (this.unitNumberingType === "Numbered")
                return (unitIndex + 1).toString();
            else if (this.unitNumberingType === "Lettered") {
                var unitName = "";
                // If we've gone passed 26 units, then start adding double characters
                var numLoopAlphabets = Math.floor(unitIndex / 26);
                if (numLoopAlphabets > 0)
                    unitName += String.fromCharCode("A".charCodeAt(0) + (numLoopAlphabets - 1));
                var letterIndex = unitIndex % 26;
                unitName += String.fromCharCode("A".charCodeAt(0) + letterIndex);
                return unitName;
            }
            else if (this.unitNumberingType === "EW" || this.unitNumberingType === "NS") {
                if ((unitIndex % 2 == 0))
                    return ((unitIndex / 2) + 1).toString() + (this.unitNumberingType === "EW" ? "E" : "N");
                else
                    return Math.ceil(unitIndex / 2).toString() + (this.unitNumberingType === "EW" ? "W" : "S");
            }
            return (unitIndex + 1).toString();
        };
        ;
        /**
         * Occurs when the user changes the unit numbering type
         */
        CondoSignUpWizardController.prototype.onNumberingTypeChange = function () {
            for (var i = 0; i < this.signUpInfo.buildings[0].units.length; ++i) {
                if (!this.signUpInfo.buildings[0].units[i])
                    this.signUpInfo.buildings[0].units[i] = {};
                this.signUpInfo.buildings[0].units[i].name = this.getUnitName(i);
            }
        };
        /**
         * Occurs when the user changes the unit numbering type
         */
        CondoSignUpWizardController.prototype.centerMap = function (geometry) {
            // If the place has a geometry, then present it on a map.
            if (geometry.viewport) {
                this.map.fitBounds(geometry.viewport);
            }
            else {
                this.map.setCenter(geometry.location);
                this.map.setZoom(17); // Why 17? Because it looks good.
            }
            this.mapMarker.setPosition(geometry.location);
            this.mapMarker.setVisible(true);
        };
        ;
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        CondoSignUpWizardController.prototype.setPlaceWasSelected = function () {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            var innerThis = this;
            setTimeout(function () {
                innerThis.placeWasSelected = true;
            }, 500);
        };
        ;
        /**
         * Perform any needed initialization
         */
        CondoSignUpWizardController.prototype.init = function () {
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted");
            var mapDiv = document.getElementById("address-map");
            this.map = new google.maps.Map(mapDiv, {
                center: { lat: 41.869638, lng: -87.657423 },
                zoom: 9
            });
            var addressInput = document.getElementById("building-0-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
            this.addressAutocomplete.bindTo('bounds', this.map);
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            });
            // Occurs when the user selects a Google suggested address
            var innerThis = this;
            this.addressAutocomplete.addListener('place_changed', function () {
                innerThis.setPlaceWasSelected();
                //infowindow.close();
                innerThis.mapMarker.setVisible(false);
                var place = innerThis.addressAutocomplete.getPlace();
                var readableAddress = place.formatted_address;
                // Remove the trailing country if it's USA
                if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                    readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                innerThis.signUpInfo.buildings[0].streetAddress = readableAddress;
                // If the name hasn't been set yet, use the address
                if (HtmlUtil.isNullOrWhitespace(innerThis.signUpInfo.name)) {
                    innerThis.$scope.$apply(function () {
                        innerThis.signUpInfo.name = place.name + " Condo Association";
                    });
                }
                if (!place.geometry) {
                    //window.alert( "Autocomplete's returned place contains no geometry" );
                    return;
                }
                innerThis.centerMap(place.geometry);
                $("#association-name-text-box").focus();
            });
            // Initialize the unit names
            innerThis.onNumUnitsChanged();
        };
        /**
         * Refresh the map to center typed in address
         */
        CondoSignUpWizardController.prototype.checkAddress = function () {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForBuildingAddress();
        };
        /**
         * Refresh the map to center typed in address
         */
        CondoSignUpWizardController.prototype.refreshMapForBuildingAddress = function () {
            this.isLoadingMap = true;
            var innerThis = this;
            HtmlUtil.geocodeAddress(this.signUpInfo.buildings[0].streetAddress, function (results, status) {
                innerThis.$scope.$apply(function () {
                    innerThis.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.buildings[0].streetAddress = readableAddress;
                    innerThis.centerMap(results[0].geometry);
                    // If the name hasn't been set yet, use the address
                    if (HtmlUtil.isNullOrWhitespace(innerThis.signUpInfo.name)) {
                        var street = HtmlUtil.getStringUpToFirst(readableAddress, ",");
                        innerThis.signUpInfo.name = street + " Condo Association";
                    }
                });
            });
        };
        ;
        /**
         * Add a building to our sign-up info
         */
        CondoSignUpWizardController.prototype.addBuilding = function () {
            var MaxBuidlings = 25;
            if (this.signUpInfo.buildings.length + 1 >= MaxBuidlings) {
                alert("We do not support more than " + MaxBuidlings + " buildings.");
                return;
            }
            this.signUpInfo.buildings.push({});
        };
        ;
        /**
         * Called when the user press the button to complete the sign-up process
         */
        CondoSignUpWizardController.prototype.onFinishedWizard = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/SignUpWizard", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    innerThis.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete");
                    // Log this as a conversion
                    if (typeof (window.goog_report_conversion) !== "undefined")
                        window.goog_report_conversion();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        window.location.href = signUpResult.createUrl;
                    }
                    else {
                        innerThis.hideWizard = true;
                        innerThis.resultMessage = "Great work! We just sent you an e-mail with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to complete sign-up: " + errorMessage);
            });
        };
        CondoSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
        return CondoSignUpWizardController;
    }());
    Ally.CondoSignUpWizardController = CondoSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("condoSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/condo-sign-up-wizard.html",
    controller: Ally.CondoSignUpWizardController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var DiscussionThread = /** @class */ (function () {
        function DiscussionThread() {
        }
        return DiscussionThread;
    }());
    Ally.DiscussionThread = DiscussionThread;
    /**
     * The controller for the page that lets users unsubscribe from discussions
     */
    var DiscussionManageController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function DiscussionManageController($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.activeView = "loading";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        DiscussionManageController.prototype.$onInit = function () {
            this.unsubscribeUser();
        };
        /**
        * Load the discussion details
        */
        DiscussionManageController.prototype.loadDiscussion = function () {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/Discussion/" + idVal).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.discussion = httpResponse.data;
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.errorMessage = "Failed to find the discussion details. Please contact support to alert them to the issue.";
            });
        };
        /**
         * Unsubscribe the user from the discussion
         */
        DiscussionManageController.prototype.unsubscribeUser = function () {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Unsubscribe/" + idVal, null).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "unsubscribed";
                innerThis.discussion = httpResponse.data;
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            });
        };
        /**
         * Resubscribe the user to a discussion
         */
        DiscussionManageController.prototype.resubscribeUser = function () {
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            this.isLoading = true;
            this.activeView = "loading";
            var innerThis = this;
            this.$http.put("/api/Discussion/Resubscribe/" + idVal, null).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "resubscribed";
            }, function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.activeView = "error";
                innerThis.errorMessage = "Failed to unsubscribe you from the discussion due to a server error.";
            });
        };
        DiscussionManageController.$inject = ["$http", "$routeParams"];
        return DiscussionManageController;
    }());
    Ally.DiscussionManageController = DiscussionManageController;
})(Ally || (Ally = {}));
CA.angularApp.component("discussionManage", {
    templateUrl: "/ngApp/chtn/public/discussion-manage.html",
    controller: Ally.DiscussionManageController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/angularjs/angular-route.d.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for a page that lets a user complain about group e-mail utilization
     */
    var EmailAbuseController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function EmailAbuseController($http, $routeParams) {
            this.$http = $http;
            this.$routeParams = $routeParams;
            this.isLoading = false;
            this.showButtons = true;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        EmailAbuseController.prototype.$onInit = function () {
        };
        /**
         * Ask that
         */
        EmailAbuseController.prototype.reportAbuse = function (abuseReason) {
            // It's double encoded to prevent angular trouble, so double decode
            var idVal = decodeURIComponent(this.$routeParams.idValue);
            var postData = {
                abuseReason: abuseReason,
                idVal: idVal,
                otherReasonText: this.otherReasonText
            };
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/EmailAbuse/v3", postData).then(function () {
                innerThis.isLoading = false;
                innerThis.showButtons = false;
            });
        };
        EmailAbuseController.$inject = ["$http", "$routeParams"];
        return EmailAbuseController;
    }());
    Ally.EmailAbuseController = EmailAbuseController;
})(Ally || (Ally = {}));
CA.angularApp.component("emailAbuse", {
    templateUrl: "/ngApp/chtn/public/email-abuse.html",
    controller: Ally.EmailAbuseController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var HoaSignerUpInfo = /** @class */ (function () {
        function HoaSignerUpInfo() {
            this.boardPositionValue = 1;
        }
        return HoaSignerUpInfo;
    }());
    Ally.HoaSignerUpInfo = HoaSignerUpInfo;
    var HoaSignUpInfo = /** @class */ (function () {
        function HoaSignUpInfo() {
            this.name = "";
            this.streetAddress = "";
            this.isResident = true;
            this.signerUpInfo = new HoaSignerUpInfo();
        }
        return HoaSignUpInfo;
    }());
    Ally.HoaSignUpInfo = HoaSignUpInfo;
    /**
     * The controller for the HOA Ally sign-up page
     */
    var HoaSignUpWizardController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function HoaSignUpWizardController($scope, $http, $timeout, WizardHandler) {
            this.$scope = $scope;
            this.$http = $http;
            this.$timeout = $timeout;
            this.WizardHandler = WizardHandler;
            this.placeWasSelected = false;
            this.shouldCheckAddress = false;
            this.isLoading = false;
            this.map = null;
            this.isLoadingMap = false;
            this.hideWizard = false;
            this.hoaPoly = { vertices: [] };
            this.showMap = false;
            // The default sign-up info object
            this.signUpInfo = new Ally.HoaSignUpInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HoaSignUpWizardController.prototype.$onInit = function () {
            var innerThis = this;
            var innerThis = this;
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                if (args.index === 1)
                    innerThis.$timeout(function () { return innerThis.showMap = true; }, 50);
                else
                    innerThis.showMap = false;
            });
        };
        /**
         * Center the Google map on a polygon
         */
        HoaSignUpWizardController.prototype.centerMap = function (geometry) {
            // If the place has a geometry, then present it on a map.
            if (geometry.viewport) {
                this.map.fitBounds(geometry.viewport);
            }
            else {
                this.map.setCenter(geometry.location);
                this.map.setZoom(17); // Why 17? Because it looks good.
            }
            this.mapMarker.setPosition(geometry.location);
            this.mapMarker.setVisible(true);
        };
        /**
         * Perform initialization to create the map and hook up address autocomplete
         */
        HoaSignUpWizardController.prototype.initMapStep = function () {
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted");
            this.showMap = true;
            var addressInput = document.getElementById("association-address-text-box");
            if (addressInput) {
                this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
                this.addressAutocomplete.bindTo('bounds', this.map);
            }
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            });
            // Occurs when the user selects a Google suggested address
            if (this.addressAutocomplete) {
                var innerThis = this;
                var onPlaceChanged = function () {
                    innerThis.setPlaceWasSelected();
                    //infowindow.close();
                    innerThis.mapMarker.setVisible(false);
                    var place = innerThis.addressAutocomplete.getPlace();
                    var readableAddress = place.formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    if (!place.geometry)
                        return;
                    innerThis.setEditPolyForAddress(place.geometry.location);
                    innerThis.centerMap(place.geometry);
                };
                this.addressAutocomplete.addListener('place_changed', function () {
                    innerThis.$scope.$apply(onPlaceChanged);
                });
            }
        };
        HoaSignUpWizardController.prototype.onMapEditorReady = function (mapInstance) {
            this.map = mapInstance;
            this.initMapStep();
        };
        /**
         * Refresh the map to center typed in address
         */
        HoaSignUpWizardController.prototype.checkAddress = function () {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForAddress();
        };
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        HoaSignUpWizardController.prototype.setPlaceWasSelected = function () {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            var innerThis = this;
            setTimeout(function () {
                innerThis.placeWasSelected = true;
            }, 500);
        };
        /**
         * Refresh the map edit box when a place is geocoded
         */
        HoaSignUpWizardController.prototype.setEditPolyForAddress = function (homePos) {
            var OffsetLat = 0.001;
            var OffsetLon = 0.0014;
            this.hoaPoly = {
                vertices: [
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() + OffsetLon },
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() + OffsetLon }
                ]
            };
        };
        /**
         * Refresh the map to center typed in address
         */
        HoaSignUpWizardController.prototype.refreshMapForAddress = function () {
            this.isLoadingMap = true;
            var innerThis = this;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, function (results, status) {
                innerThis.$scope.$apply(function () {
                    innerThis.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    if (!results[0].geometry)
                        return;
                    innerThis.setEditPolyForAddress(results[0].geometry.location);
                    innerThis.centerMap(results[0].geometry);
                });
            });
        };
        /**
         * Called when the user press the button to complete the sign-up process
         */
        HoaSignUpWizardController.prototype.onFinishedWizard = function () {
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            var innerThis = this;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    innerThis.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete");
                    // Log this as a conversion
                    if (typeof (window.goog_report_conversion) !== "undefined")
                        window.goog_report_conversion();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        window.location.href = signUpResult.createUrl;
                    }
                    else {
                        innerThis.hideWizard = true;
                        innerThis.resultMessage = "Great work! We just sent you an e-mail with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
            });
        };
        HoaSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
        return HoaSignUpWizardController;
    }());
    Ally.HoaSignUpWizardController = HoaSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/hoa-sign-up-wizard.html",
    controller: Ally.HoaSignUpWizardController
});

var Ally;
(function (Ally) {
    var NewUserSignUpInfo = /** @class */ (function () {
        function NewUserSignUpInfo() {
        }
        return NewUserSignUpInfo;
    }());
    /**
     * The controller for the Neighborhood Ally sign-up page
     */
    var NeighborSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function NeighborSignUpController($http) {
            this.$http = $http;
            this.isLoading = false;
            this.signUpInfo = new NewUserSignUpInfo();
            this.resultIsError = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        NeighborSignUpController.prototype.$onInit = function () {
            // Hook up address auto-complete, after the page has loaded
            setTimeout(function () {
                var addressInput = document.getElementById("address-text-box");
                new google.maps.places.Autocomplete(addressInput);
            }, 750);
        };
        /**
         * Occurs when the user clicks the button to submit their e-mail address
         */
        NeighborSignUpController.prototype.onSubmitInfo = function () {
            if (HtmlUtil.isNullOrWhitespace(this.signUpInfo.emailAddress)) {
                alert("Please enter an e-mail address");
                return;
            }
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/NeighborSignUp/SignUpNewUser", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.resultIsError = false;
                innerThis.resultMessage = "Your information has been successfully submitted. Look for a welcome email soon.";
            }, function () {
                innerThis.isLoading = false;
                innerThis.resultIsError = true;
                innerThis.resultMessage = "There was an error submitting your information. Please try again.";
            });
        };
        /**
         * Occurs when the user wants to retry submission of their info
         */
        NeighborSignUpController.prototype.goBack = function () {
            this.resultMessage = null;
        };
        NeighborSignUpController.$inject = ["$http"];
        return NeighborSignUpController;
    }());
    Ally.NeighborSignUpController = NeighborSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component("neighborSignUp", {
    templateUrl: "/ngApp/chtn/public/neighbor-sign-up.html",
    controller: Ally.NeighborSignUpController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
var Ally;
(function (Ally) {
    var TempNeighborhoodSignUpInfo = /** @class */ (function () {
        function TempNeighborhoodSignUpInfo() {
            this.fullName = "";
            this.email = "";
            this.address = "";
            this.neighborhoodName = "";
            this.notes = "";
        }
        return TempNeighborhoodSignUpInfo;
    }());
    /**
     * The controller for the HOA Ally sign-up page
     */
    var NeighborhoodSignUpWizardController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function NeighborhoodSignUpWizardController($scope, $http, $timeout, WizardHandler) {
            this.$scope = $scope;
            this.$http = $http;
            this.$timeout = $timeout;
            this.WizardHandler = WizardHandler;
            this.placeWasSelected = false;
            this.shouldCheckAddress = false;
            this.isLoading = false;
            this.map = null;
            this.isLoadingMap = false;
            this.hideWizard = false;
            this.hoaPoly = { vertices: [] };
            this.showMap = false;
            this.tempSignUpInfo = new TempNeighborhoodSignUpInfo();
            // The default sign-up info object
            this.signUpInfo = new Ally.HoaSignUpInfo();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        NeighborhoodSignUpWizardController.prototype.$onInit = function () {
            var innerThis = this;
            var innerThis = this;
            this.$scope.$on('wizard:stepChanged', function (event, args) {
                if (args.index === 1)
                    innerThis.$timeout(function () { return innerThis.showMap = true; }, 50);
                else
                    innerThis.showMap = false;
            });
            setTimeout(function () {
                var addressInput = document.getElementById("signUpAddress");
                if (addressInput)
                    new google.maps.places.Autocomplete(addressInput);
            }, 500);
        };
        /**
         * Submit the
         */
        NeighborhoodSignUpWizardController.prototype.onSubmitTempInfo = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/SignUpWizard/TempNeighborhood", this.tempSignUpInfo).then(function () {
                innerThis.isLoading = false;
                innerThis.submitTempResult = "Thank you for your submission. We'll be in touch shortly.";
            }, function (response) {
                innerThis.isLoading = false;
                innerThis.submitTempResult = "Submission failed: " + response.data.exceptionMessage + ". Feel free to refresh the page to try again or use the contact form at the bottom of the Community Ally home page.";
            });
        };
        /**
         * Center the Google map on a polygon
         */
        NeighborhoodSignUpWizardController.prototype.centerMap = function (geometry) {
            // If the place has a geometry, then present it on a map.
            if (geometry.viewport) {
                this.map.fitBounds(geometry.viewport);
            }
            else {
                this.map.setCenter(geometry.location);
                this.map.setZoom(17); // Why 17? Because it looks good.
            }
            this.mapMarker.setPosition(geometry.location);
            this.mapMarker.setVisible(true);
        };
        /**
         * Perform initialization to create the map and hook up address autocomplete
         */
        NeighborhoodSignUpWizardController.prototype.initMapStep = function () {
            if (typeof (window.analytics) !== "undefined")
                window.analytics.track("condoSignUpStarted");
            this.showMap = true;
            var addressInput = document.getElementById("association-address-text-box");
            if (addressInput) {
                this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
                this.addressAutocomplete.bindTo('bounds', this.map);
            }
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                position: null,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png"
            });
            // Occurs when the user selects a Google suggested address
            if (this.addressAutocomplete) {
                var innerThis = this;
                var onPlaceChanged = function () {
                    innerThis.setPlaceWasSelected();
                    //infowindow.close();
                    innerThis.mapMarker.setVisible(false);
                    var place = innerThis.addressAutocomplete.getPlace();
                    var readableAddress = place.formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    if (!place.geometry)
                        return;
                    innerThis.setEditPolyForAddress(place.geometry.location);
                    innerThis.centerMap(place.geometry);
                };
                this.addressAutocomplete.addListener('place_changed', function () {
                    innerThis.$scope.$apply(onPlaceChanged);
                });
            }
        };
        NeighborhoodSignUpWizardController.prototype.onMapEditorReady = function (mapInstance) {
            this.map = mapInstance;
            this.initMapStep();
        };
        /**
         * Refresh the map to center typed in address
         */
        NeighborhoodSignUpWizardController.prototype.checkAddress = function () {
            if (this.placeWasSelected || !this.shouldCheckAddress)
                return;
            this.shouldCheckAddress = false;
            this.refreshMapForAddress();
        };
        /**
         * Occurs when the user selects an address from the Google suggestions
         */
        NeighborhoodSignUpWizardController.prototype.setPlaceWasSelected = function () {
            this.placeWasSelected = true;
            this.shouldCheckAddress = false;
            // Clear the flag in case the user types in a new address
            var innerThis = this;
            setTimeout(function () {
                innerThis.placeWasSelected = true;
            }, 500);
        };
        /**
         * Refresh the map edit box when a place is geocoded
         */
        NeighborhoodSignUpWizardController.prototype.setEditPolyForAddress = function (homePos) {
            var OffsetLat = 0.001;
            var OffsetLon = 0.0014;
            this.hoaPoly = {
                vertices: [
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() - OffsetLon },
                    { lat: homePos.lat() + OffsetLat, lon: homePos.lng() + OffsetLon },
                    { lat: homePos.lat() - OffsetLat, lon: homePos.lng() + OffsetLon }
                ]
            };
        };
        /**
         * Refresh the map to center typed in address
         */
        NeighborhoodSignUpWizardController.prototype.refreshMapForAddress = function () {
            this.isLoadingMap = true;
            var innerThis = this;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, function (results, status) {
                innerThis.$scope.$apply(function () {
                    innerThis.isLoadingMap = false;
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    if (!results[0].geometry)
                        return;
                    innerThis.setEditPolyForAddress(results[0].geometry.location);
                    innerThis.centerMap(results[0].geometry);
                });
            });
        };
        /**
         * Called when the user press the button to complete the sign-up process
         */
        NeighborhoodSignUpWizardController.prototype.onFinishedWizard = function () {
            this.isLoading = true;
            this.signUpInfo.boundsGpsVertices = this.hoaPoly.vertices;
            var innerThis = this;
            this.$http.post("/api/SignUpWizard/Hoa", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var signUpResult = httpResponse.data;
                // If the was an error creating the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    innerThis.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
                else {
                    if (typeof (window.analytics) !== "undefined")
                        window.analytics.track("condoSignUpComplete");
                    // Log this as a conversion
                    if (typeof (window.goog_report_conversion) !== "undefined")
                        window.goog_report_conversion();
                    // Or if the user created an active signUpResult
                    if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                        window.location.href = signUpResult.createUrl;
                    }
                    else {
                        innerThis.hideWizard = true;
                        innerThis.resultMessage = "Great work! We just sent you an e-mail with instructions on how access your new site.";
                    }
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                alert("Failed to complete sign-up: " + httpResponse.data.exceptionMessage);
            });
        };
        NeighborhoodSignUpWizardController.$inject = ["$scope", "$http", "$timeout", "WizardHandler"];
        return NeighborhoodSignUpWizardController;
    }());
    Ally.NeighborhoodSignUpWizardController = NeighborhoodSignUpWizardController;
})(Ally || (Ally = {}));
CA.angularApp.component("neighborhoodSignUpWizard", {
    templateUrl: "/ngApp/chtn/public/neighborhood-sign-up-wizard.html",
    controller: Ally.NeighborhoodSignUpWizardController
});

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the committee home page
     */
    var CommitteeHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function CommitteeHomeController($http, $rootScope, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CommitteeHomeController.prototype.$onInit = function () {
        };
        CommitteeHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory"];
        return CommitteeHomeController;
    }());
    Ally.CommitteeHomeController = CommitteeHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeHome", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/committee/committee-home.html",
    controller: Ally.CommitteeHomeController
});

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../chtn/manager/manage-committees-ctrl.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the committee parent view
     */
    var CommitteeParentController = /** @class */ (function () {
        /**
        * The constructor for the class
        */
        function CommitteeParentController($http, siteInfo, $routeParams) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$routeParams = $routeParams;
            this.canManage = false;
            this.selectedView = "home";
            this.isLoading = false;
            this.committeeId = this.$routeParams.committeeId;
            this.selectedView = this.$routeParams.viewName || "home";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        CommitteeParentController.prototype.$onInit = function () {
            this.canManage = this.siteInfo.userInfo.isSiteManager;
            this.retrieveCommittee();
        };
        /*
         * Retreive the committee data
         */
        CommitteeParentController.prototype.retrieveCommittee = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/Committee/" + this.committeeId).success(function (committee) {
                innerThis.isLoading = false;
                innerThis.committee = committee;
            }).error(function (exc) {
                innerThis.isLoading = false;
                alert("Failed to load committee: " + exc.exceptionMessage);
            });
        };
        /*
         * Called after the user edits the committee name
         */
        CommitteeParentController.prototype.onUpdateCommitteeName = function () {
            this.isLoading = true;
            var putUri = "/api/Committee/" + this.committeeId + "?newName=" + this.committee.name;
            var innerThis = this;
            this.$http.put(putUri, null).success(function () {
                innerThis.isLoading = false;
            }).error(function (exc) {
                innerThis.isLoading = false;
                alert("Failed to update the committee name: " + exc.exceptionMessage);
            });
        };
        CommitteeParentController.$inject = ["$http", "SiteInfo", "$routeParams"];
        return CommitteeParentController;
    }());
    Ally.CommitteeParentController = CommitteeParentController;
})(Ally || (Ally = {}));
CA.angularApp.component("committeeParent", {
    templateUrl: "/ngApp/committee/committee-parent.html",
    controller: Ally.CommitteeParentController
});

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    var InfoItem = /** @class */ (function () {
        function InfoItem() {
        }
        return InfoItem;
    }());
    Ally.InfoItem = InfoItem;
    /**
     * The controller for the frequently asked questions widget
     */
    var FAQsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function FAQsController($http, $rootScope, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.isBodyMissing = false;
            this.isSiteManager = false;
            this.editingInfoItem = new InfoItem();
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        FAQsController.prototype.$onInit = function () {
            this.hideDocuments = this.$rootScope["userInfo"].isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.isSiteManager = this.$rootScope["isSiteManager"];
            this.retrievePageInfo();
            // Hook up the rich text editor
            window.setTimeout(function () {
                var showErrorAlert = function (reason, detail) {
                    var msg = "";
                    if (reason === "unsupported-file-type")
                        msg = "Unsupported format " + detail;
                    else
                        console.log("error uploading file", reason, detail);
                    $('<div class="alert"> <button type="button" class="close" data-dismiss="alert">&times;</button>' +
                        '<strong>File upload error</strong> ' + msg + ' </div>').prependTo('#alerts');
                };
                function initToolbarBootstrapBindings() {
                    var fonts = ['Serif', 'Sans', 'Arial', 'Arial Black', 'Courier',
                        'Courier New', 'Comic Sans MS', 'Helvetica', 'Impact', 'Lucida Grande', 'Lucida Sans', 'Tahoma', 'Times',
                        'Times New Roman', 'Verdana'], fontTarget = $('[title=Font]').siblings('.dropdown-menu');
                    $.each(fonts, function (idx, fontName) {
                        fontTarget.append($('<li><a data-edit="fontName ' + fontName + '" style="font-family:\'' + fontName + '\'">' + fontName + '</a></li>'));
                    });
                    var tooltipper = $('a[title]');
                    tooltipper.tooltip({ container: 'body' });
                    $('.dropdown-menu input')
                        .click(function () { return false; })
                        .change(function () {
                        var drops = $(this).parent('.dropdown-menu').siblings('.dropdown-toggle');
                        drops.dropdown('toggle');
                    })
                        .keydown('esc', function () { this.value = ''; $(this).change(); });
                    $('[data-role=magic-overlay]').each(function () {
                        var overlay = $(this), target = $(overlay.data('target'));
                        overlay.css('opacity', 0).css('position', 'absolute').offset(target.offset()).width(target.outerWidth()).height(target.outerHeight());
                    });
                    if ("onwebkitspeechchange" in document.createElement("input")) {
                        var editorOffset = $('#editor').offset();
                        $('#voiceBtn').css('position', 'absolute').offset({ top: editorOffset.top, left: editorOffset.left + $('#editor').innerWidth() - 35 });
                    }
                    else {
                        $('#voiceBtn').hide();
                    }
                }
                ;
                initToolbarBootstrapBindings();
                var editorElem = $('#editor');
                editorElem.wysiwyg({ fileUploadError: showErrorAlert });
            }, 10);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the info section
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.retrieveInfo = function () {
            this.isLoadingInfo = true;
            var innerThis = this;
            this.$http.get("/api/InfoItem", { cache: true }).then(function (httpResponse) {
                innerThis.isLoadingInfo = false;
                innerThis.infoItems = httpResponse.data;
            });
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.retrievePageInfo = function () {
            this.retrieveInfo();
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Scroll to an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.scrollToInfo = function (infoItemIndex) {
            document.getElementById("info-item-title-" + infoItemIndex).scrollIntoView();
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user edits an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onStartEditInfoItem = function (infoItem) {
            // Clone the object
            this.editingInfoItem = jQuery.extend({}, infoItem);
            $("#editor").html(this.editingInfoItem.body);
            // Scroll down to the editor
            window.scrollTo(0, document.body.scrollHeight);
        };
        ;
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to add a new info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onSubmitItem = function () {
            this.editingInfoItem.body = $("#editor").html();
            this.isBodyMissing = HtmlUtil.isNullOrWhitespace(this.editingInfoItem.body);
            var validateable = $("#info-item-edit-form");
            validateable.validate();
            if (!validateable.valid() || this.isBodyMissing)
                return;
            this.isLoadingInfo = true;
            var innerThis = this;
            var onSave = function () {
                innerThis.isLoadingInfo = false;
                $("#editor").html("");
                innerThis.editingInfoItem = new InfoItem();
                innerThis.$cacheFactory.get('$http').remove("/api/InfoItem");
                innerThis.retrieveInfo();
            };
            var onError = function () {
                innerThis.isLoadingInfo = false;
                alert("Failed to save your information. Please try again and if this happens again contact support.");
            };
            // If we're editing an existing info item
            if (typeof (this.editingInfoItem.infoItemId) == "number")
                this.$http.put("/api/InfoItem", this.editingInfoItem).then(onSave);
            else
                this.$http.post("/api/InfoItem", this.editingInfoItem).then(onSave);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onDeleteInfoItem = function (infoItem) {
            if (!confirm('Are you sure you want to delete this information?'))
                return;
            this.isLoadingInfo = true;
            var innerThis = this;
            this.$http.delete("/api/InfoItem/" + infoItem.infoItemId).then(function () {
                innerThis.isLoadingInfo = false;
                innerThis.$cacheFactory.get('$http').remove("/api/InfoItem");
                innerThis.retrievePageInfo();
            });
        };
        FAQsController.$inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory"];
        return FAQsController;
    }());
    Ally.FAQsController = FAQsController;
})(Ally || (Ally = {}));
CA.angularApp.component("faqs", {
    templateUrl: "/ngApp/common/FAQs.html",
    controller: Ally.FAQsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members view and vote on active polls
     */
    var ActivePollsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function ActivePollsController($http, siteInfo, $timeout, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.$rootScope = $rootScope;
            this.isLoading = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        ActivePollsController.prototype.$onInit = function () {
            this.refreshPolls();
        };
        /**
         * Retrieve any active polls from the server
         */
        ActivePollsController.prototype.populatePollData = function (pollData) {
            this.polls = pollData;
            // If there are polls then tell the home to display the poll area
            if (pollData && pollData.length > 0)
                this.$rootScope.$broadcast("homeHasActivePolls");
            for (var pollIndex = 0; pollIndex < this.polls.length; ++pollIndex) {
                var poll = this.polls[pollIndex];
                if (poll.hasUsersUnitVoted) {
                    if (poll.canViewResults) {
                        var answers = _.groupBy(poll.responses, "answerId");
                        poll.chartData = [];
                        poll.chartLabels = [];
                        for (var answerId in answers) {
                            if (answers.hasOwnProperty(answerId)) {
                                poll.chartLabels.push(_.find(poll.answers, function (a) { return a.pollAnswerId == answerId; }).answerText);
                                poll.chartData.push(answers[answerId].length);
                                //poll.chartData.push(
                                //{
                                //    key: _.find( poll.answers, function( a ) { return a.pollAnswerId == answerId; } ).answerText,
                                //    y: answers[answerId].length
                                //} );
                            }
                        }
                        if (poll.responses && poll.responses.length < this.siteInfo.privateSiteInfo.numUnits) {
                            poll.chartLabels.push("No Response");
                            poll.chartData.push(this.siteInfo.privateSiteInfo.numUnits - poll.responses.length);
                        }
                    }
                }
            }
        };
        /**
         * Populate the polls section from the server
         */
        ActivePollsController.prototype.refreshPolls = function () {
            // Grab the polls
            this.isLoading = true;
            var innerThis = this;
            this.$http({ method: 'GET', url: '/api/Poll?getActive=1' }).
                then(function (httpResponse) {
                innerThis.isLoading = false;
                // Delay the processing a bit to help the home page load faster
                innerThis.$timeout(function () {
                    innerThis.populatePollData(httpResponse.data);
                }, 100);
            }, function () {
                innerThis.isLoading = false;
            });
        };
        /**
         * Occurs when the user selects a poll answer
         */
        ActivePollsController.prototype.onPollAnswer = function (poll, pollAnswer, writeInAnswer) {
            this.isLoading = true;
            var putUri = "/api/PollResponse?pollId=" + poll.pollId + "&answerId=" + (pollAnswer ? pollAnswer.pollAnswerId : "") + "&writeInAnswer=" + writeInAnswer;
            var innerThis = this;
            this.$http.put(putUri, null).
                then(function (httpResponse) {
                innerThis.polls = httpResponse.data;
                innerThis.isLoading = false;
                innerThis.refreshPolls();
            }, function () {
                innerThis.isLoading = false;
            });
        };
        ActivePollsController.$inject = ["$http", "SiteInfo", "$timeout", "$rootScope"];
        return ActivePollsController;
    }());
    Ally.ActivePollsController = ActivePollsController;
})(Ally || (Ally = {}));
CA.angularApp.component("activePolls", {
    templateUrl: "/ngApp/common/active-polls.html",
    controller: Ally.ActivePollsController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets residents pay their assessments
     */
    var AssessmentPaymentFormController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function AssessmentPaymentFormController($http, siteInfo, $rootScope) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$rootScope = $rootScope;
            this.isLoading_Payment = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        AssessmentPaymentFormController.prototype.$onInit = function () {
            this.allyAppName = AppConfig.appName;
            this.isAutoPayActive = this.siteInfo.userInfo.isAutoPayActive;
            this.assessmentCreditCardFeeLabel = this.siteInfo.privateSiteInfo.payerPaysCCFee ? "Service fee applies" : "No service fee";
            this.assessmentAchFeeLabel = this.siteInfo.privateSiteInfo.payerPaysAchFee ? "Service fee applies" : "No service fee";
            this.payerPaysAchFee = this.siteInfo.privateSiteInfo.payerPaysAchFee;
            this.errorPayInfoText = "Is the amount incorrect?";
            this.isWePaySetup = this.siteInfo.privateSiteInfo.isPaymentEnabled;
            this.hasAssessments = this.siteInfo.privateSiteInfo.hasAssessments;
            this.assessmentFrequency = this.siteInfo.privateSiteInfo.assessmentFrequency;
            if (!this.isAutoPayActive && HtmlUtil.isNumericString(HtmlUtil.GetQueryStringParameter("preapproval_id"))) {
                // The user just set up auto-pay and it may take a second
                this.isAutoPayActive = true;
            }
            this.nextAutoPayText = this.siteInfo.userInfo.nextAutoPayText;
            // Grab the assessment from the user's unit (TODO handle multiple units)
            if (this.siteInfo.userInfo.usersUnits != null && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.assessmentAmount = this.siteInfo.userInfo.usersUnits[0].assessment;
            }
            else
                this.assessmentAmount = 0;
            this.paymentInfo =
                {
                    paymentType: "other",
                    amount: this.assessmentAmount,
                    note: "",
                    fundingType: null
                };
            var MaxNumRecentPayments = 6;
            this.recentPayments = this.siteInfo.userInfo.recentPayments;
            if (this.recentPayments && this.recentPayments.length > 0) {
                if (this.recentPayments.length > MaxNumRecentPayments)
                    this.recentPayments = this.recentPayments.slice(0, MaxNumRecentPayments);
                this.numRecentPayments = this.recentPayments.length;
                // Fill up the list so there's always MaxNumRecentPayments
                while (this.recentPayments.length < MaxNumRecentPayments)
                    this.recentPayments.push({});
            }
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency != null
                && this.siteInfo.userInfo.usersUnits != null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText(this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue, this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
            setTimeout(function () {
                $('#btn_view_pay_history').click(function () {
                    $('#pm_info').collapse('hide');
                    $('#payment_history').collapse('show');
                });
                $('#btn_view_pay_info').click(function () {
                    $('#payment_history').collapse('hide');
                    $('#pm_info').collapse('show');
                });
                $('.hide').click(function () {
                    $(this).parent().hide('');
                });
            }, 400);
        };
        /**
         * Occurs when the user presses the button to make a payment to their organization
         */
        AssessmentPaymentFormController.prototype.makePayment = function (fundingTypeName) {
            this.isLoading_Payment = true;
            this.paymentInfo.fundingType = fundingTypeName;
            analytics.track("makePayment", {
                fundingType: fundingTypeName
            });
            var innerThis = this;
            this.$http.post("/api/WePayPayment", this.paymentInfo).then(function (httpResponse) {
                var checkoutInfo = httpResponse.data;
                if (checkoutInfo !== null && typeof (checkoutInfo.checkoutUri) === "string" && checkoutInfo.checkoutUri.length > 0)
                    window.location.href = checkoutInfo.checkoutUri;
                else {
                    innerThis.isLoading_Payment = false;
                    alert("Unable to initiate WePay checkout");
                }
            }, function (httpResponse) {
                innerThis.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the helper link to prep an e-mail to inquire the board as to
         * why their records don't line up.
         */
        AssessmentPaymentFormController.prototype.onIncorrectPayDetails = function () {
            // Get the friendly looking assessment value (ex: 100, 101, 102.50)
            var amountString = this.assessmentAmount.toString();
            if (Math.round(this.assessmentAmount) != this.assessmentAmount)
                amountString = this.assessmentAmount.toFixed(2);
            // Tell the groupSendEmail component to prep an e-mail for the board
            var prepEventData = amountString;
            if (this.knowsNextPayment && HtmlUtil.isValidString(this.nextPaymentText))
                prepEventData += "|" + this.nextPaymentText;
            this.$rootScope.$broadcast("prepAssessmentEmailToBoard", prepEventData);
        };
        /**
         * Refresh the not text for the payment field
         */
        AssessmentPaymentFormController.prototype.updatePaymentText = function () {
            if (this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                // If we have a next payment string
                if (!HtmlUtil.isNullOrWhitespace(this.nextPaymentText)) {
                    if (this.siteInfo.userInfo.usersUnits[0].includesLateFee)
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";
                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else {
                this.paymentInfo.note = "";
            }
        };
        AssessmentPaymentFormController.prototype.onSelectPaymentType = function (paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType == "periodic" ? this.assessmentAmount : 0;
            this.updatePaymentText();
        };
        /**
         * Generate the friendly string describing to what the member's next payment applies
         */
        AssessmentPaymentFormController.prototype.getNextPaymentText = function (payPeriods, assessmentFrequency) {
            if (payPeriods == null)
                return "";
            // Ensure the periods is an array
            if (payPeriods.constructor !== Array)
                payPeriods = [payPeriods];
            var paymentText = "";
            var frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            for (var periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex) {
                var curPeriod = payPeriods[periodIndex];
                if (frequencyInfo.intervalName === "month") {
                    var monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "quarter") {
                    var periodNames = ["Q1", "Q2", "Q3", "Q4"];
                    paymentText = periodNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "half-year") {
                    var periodNames = ["First Half", "Second Half"];
                    paymentText = periodNames[curPeriod.period - 1];
                }
                paymentText += " " + curPeriod.year;
                this.paymentInfo.paysFor = [curPeriod];
            }
            return paymentText;
        };
        /**
         * Occurs when the user presses the button to etup auto-pay for assessments
         */
        AssessmentPaymentFormController.prototype.onSetupAutoPay = function (fundingTypeName) {
            this.isLoading_Payment = true;
            var innerThis = this;
            this.$http.get("/api/WePayPayment/SetupAutoPay?fundingType=" + fundingTypeName).then(function (httpResponse) {
                var redirectUrl = httpResponse.data;
                if (typeof (redirectUrl) === "string" && redirectUrl.length > 0)
                    window.location.href = redirectUrl;
                else {
                    innerThis.isLoading_Payment = false;
                    alert("Unable to initiate WePay auto-pay setup");
                }
            }, function (httpResponse) {
                innerThis.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        /**
         * Occurs when the user clicks the button to disable auto-pay
         */
        AssessmentPaymentFormController.prototype.onDisableAutoPay = function () {
            if (!confirm("Just to double check, this will disable your auto-payment. You need to make sure to manually make your regular payments to avoid any late fees your association may enforce."))
                return;
            this.isLoading_Payment = true;
            var innerThis = this;
            this.$http.get("/api/WePayPayment/DisableAutoPay").then(function () {
                innerThis.isLoading_Payment = false;
                innerThis.isAutoPayActive = false;
            }, function (httpResponse) {
                innerThis.isLoading_Payment = false;
                if (httpResponse.data && httpResponse.data.exceptionMessage)
                    alert(httpResponse.data.exceptionMessage);
            });
        };
        AssessmentPaymentFormController.$inject = ["$http", "SiteInfo", "$rootScope"];
        return AssessmentPaymentFormController;
    }());
    Ally.AssessmentPaymentFormController = AssessmentPaymentFormController;
})(Ally || (Ally = {}));
CA.angularApp.component("assessmentPaymentForm", {
    templateUrl: "/ngApp/common/assessment-payment-form.html",
    controller: Ally.AssessmentPaymentFormController
});

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Scripts/typings/moment/moment.d.ts" />
/// <reference path="../../Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    var DocumentTreeFile = /** @class */ (function () {
        function DocumentTreeFile() {
        }
        return DocumentTreeFile;
    }());
    Ally.DocumentTreeFile = DocumentTreeFile;
    var DocumentDirectory = /** @class */ (function () {
        function DocumentDirectory() {
        }
        DocumentDirectory.prototype.getSubDirectoryByName = function (dirName) {
            if (!this.subdirectories)
                return null;
            for (var dirIndex = 0; dirIndex < this.subdirectories.length; ++dirIndex) {
                if (this.subdirectories[dirIndex].name === dirName)
                    return this.subdirectories[dirIndex];
            }
            return null;
        };
        return DocumentDirectory;
    }());
    Ally.DocumentDirectory = DocumentDirectory;
    /**
     * The controller for the documents widget that lets group view, upload, and modify documents
     */
    var DocumentsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function DocumentsController($http, $rootScope, $cacheFactory, $scope) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.$cacheFactory = $cacheFactory;
            this.$scope = $scope;
            this.isLoading = false;
            this.filesSortDescend = false;
            this.title = "Documents";
            this.getDocsUri = "/api/ManageDocuments";
            this.fileSortType = window.localStorage[DocumentsController.LocalStorageKey_SortType];
            if (!this.fileSortType)
                this.fileSortType = "title";
            this.filesSortDescend = window.localStorage[DocumentsController.LocalStorageKey_SortDirection] === "true";
            this.fileSearch = {
                all: ""
            };
            this.isSiteManager = $rootScope["isSiteManager"];
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        DocumentsController.prototype.$onInit = function () {
            this.apiAuthToken = this.$rootScope.authToken;
            this.Refresh();
            var innerThis = this;
            var hookUpFileUpload = function () {
                $(function () {
                    var uploader = $('#JQFileUploader');
                    uploader.fileupload({
                        autoUpload: true,
                        add: function (e, data) {
                            //var scopeElement = document.getElementById( 'documents-area' );
                            //var scope = angular.element( scopeElement ).scope();
                            //innerThis.$scope.$apply( function() { innerThis.isLoading = false; });
                            var dirPath = innerThis.getSelectedDirectoryPath();
                            $("#FileUploadProgressContainer").show();
                            data.url = "api/DocumentUpload?dirPath=" + encodeURIComponent(dirPath) + "&ApiAuthToken=" + innerThis.apiAuthToken;
                            var xhr = data.submit();
                            xhr.done(function (result) {
                                // Clear the document cache
                                innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                                $("#FileUploadProgressContainer").hide();
                                innerThis.Refresh();
                            });
                        },
                        progressall: function (e, data) {
                            var progress = parseInt((data.loaded / data.total * 100).toString(), 10);
                            $('#FileUploadProgressBar').css('width', progress + '%');
                            if (progress === 100)
                                $("#FileUploadProgressLabel").text("Finalizing Upload...");
                            else
                                $("#FileUploadProgressLabel").text(progress + "%");
                        }
                    });
                });
            };
            setTimeout(hookUpFileUpload, 100);
            if (this.committee)
                this.title = this.committee.name + " Documents";
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.getSelectedDirectoryPath = function () {
            return this.getDirectoryFullPath(this.selectedDirectory);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the name of the selected directory. If it is a sub-directory then include the parent
        // name.
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.getDirectoryFullPath = function (dir) {
            var curPath = dir.name;
            var parentDir = dir.parentDirectory;
            while (parentDir) {
                curPath = parentDir.name + "/" + curPath;
                parentDir = parentDir.parentDirectory;
            }
            if (this.committee)
                curPath = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + curPath;
            return curPath;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Find a directory object by name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.FindDirectoryByPath = function (dirPath) {
            if (!this.documentTree)
                return;
            // Remove the committee prefix if there is one
            if (this.committee && HtmlUtil.startsWith(dirPath, DocumentsController.DirName_Committees)) {
                dirPath = dirPath.substr(DocumentsController.DirName_Committees.length + 1);
                var lastSlashIndex = dirPath.indexOf('/');
                if (lastSlashIndex !== -1)
                    dirPath = dirPath.substr(lastSlashIndex + 1);
            }
            // Split on slashes
            var dirPathParts = dirPath.split("/");
            var curDir = this.documentTree;
            for (var i = 0; i < dirPathParts.length; ++i) {
                curDir = curDir.getSubDirectoryByName(dirPathParts[i]);
                if (!curDir)
                    break;
            }
            return curDir;
        };
        DocumentsController.prototype.updateFileFilter = function () {
            var lowerFilter = angular.lowercase(this.fileSearch.all) || '';
            var filterSearchFiles = function (file) {
                return angular.lowercase(file.localFilePath || '').indexOf(lowerFilter) !== -1
                    || angular.lowercase(file.uploadDateString || '').indexOf(lowerFilter) !== -1
                    || angular.lowercase(file.uploaderFullName || '').indexOf(lowerFilter) !== -1;
            };
            this.searchFileList = _.filter(this.fullSearchFileList, filterSearchFiles);
            setTimeout(function () {
                // Force redraw of the document. Not sure why, but the file list disappears on Chrome
                var element = document.getElementById("documents-area");
                var disp = element.style.display;
                element.style.display = 'none';
                var trick = element.offsetHeight;
                element.style.display = disp;
            }, 50);
        };
        // Make it so the user can drag and drop files between folders
        DocumentsController.prototype.hookUpFileDragging = function () {
            // If the user can't manage the association then do nothing
            if (!this.isSiteManager)
                return;
            var innerThis = this;
            setTimeout(function () {
                // Make the folders accept dropped files
                var droppables = $(".droppable");
                droppables.droppable({
                    drop: function (event, ui) {
                        var selectedDirectoryPath = innerThis.getSelectedDirectoryPath();
                        var uiDraggable = $(ui.draggable);
                        uiDraggable.draggable("option", "revert", "false");
                        var destFolderName = $(this).attr("data-folder-path").trim();
                        innerThis.$scope.$apply(function () {
                            // Display the loading image
                            innerThis.isLoading = true;
                            var fileAction = {
                                relativeS3Path: innerThis.selectedFile.relativeS3Path,
                                action: "move",
                                newFileName: "",
                                sourceFolderPath: selectedDirectoryPath,
                                destinationFolderPath: destFolderName
                            };
                            //innerThis.selectedDirectory = null;
                            innerThis.selectedFile = null;
                            // Tell the server
                            innerThis.$http.put("/api/ManageDocuments/MoveFile", fileAction).then(function () {
                                innerThis.isLoading = false;
                                // Clear the document cache
                                innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                                innerThis.Refresh();
                                //innerThis.documentTree = httpResponse.data;
                                //innerThis.documentTree.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
                                //// Hook up parent directories
                                //innerThis.documentTree.subdirectories.forEach(( dir ) =>
                                //{
                                //    innerThis.hookupParentDirs( dir );
                                //} );
                                //innerThis.hookUpFileDragging();
                                //// Find the directory we had selected
                                //innerThis.selectedDirectory = innerThis.FindDirectoryByPath( selectedDirectoryPath );
                                //innerThis.SortFiles();
                            }, function (data) {
                                innerThis.isLoading = false;
                                var message = data.exceptionMessage || data.message || data;
                                alert("Failed to move file: " + message);
                            });
                        });
                    },
                    hoverClass: "Document_Folder_DropHover"
                });
                // Allow the files to be dragged
                var draggables = $(".draggable");
                draggables.draggable({
                    distance: 10,
                    revert: true,
                    helper: "clone",
                    opacity: 0.7,
                    containment: "document",
                    appendTo: "body",
                    start: function (event, ui) {
                        // Get the index of the file being dragged (ID is formatted like "File_12")
                        var fileIndexString = $(this).attr("id").substring("File_".length);
                        var fileIndex = parseInt(fileIndexString);
                        innerThis.$scope.$apply(function () {
                            var fileInfo = innerThis.selectedDirectory.files[fileIndex];
                            innerThis.selectedFile = fileInfo;
                        });
                    }
                });
            }, 250);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a directory gets clicked. I made this an inline expression, but the model did
        // not refresh
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onDirectoryClicked = function (dir) {
            this.selectedDirectory = dir;
            this.selectedFile = null;
            this.fileSearch.all = null;
            this.hookUpFileDragging();
            this.SortFiles();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the current directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.CreateDirectory = function () {
            this.createUnderParentDirName = null;
            if (this.committee)
                this.createUnderParentDirName = DocumentsController.DirName_Committees + "/" + this.committee.committeeId;
            this.shouldShowCreateFolderModal = true;
            setTimeout(function () { $('#CreateDirectoryNameTextBox').focus(); }, 50);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to create a directory within the current directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.CreateSubDirectory = function () {
            this.createUnderParentDirName = this.selectedDirectory.name;
            if (this.committee)
                this.createUnderParentDirName = DocumentsController.DirName_Committees + "/" + this.committee.committeeId + "/" + this.createUnderParentDirName;
            this.shouldShowCreateFolderModal = true;
            setTimeout(function () { $('#CreateDirectoryNameTextBox').focus(); }, 50);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to sort the files
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.SetFileSortType = function (sortType) {
            // If we're already sorting by this property, flip the order
            if (this.fileSortType === sortType)
                this.filesSortDescend = !this.filesSortDescend;
            else
                this.filesSortDescend = false;
            this.fileSortType = sortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortType] = this.fileSortType;
            window.localStorage[DocumentsController.LocalStorageKey_SortDirection] = this.filesSortDescend;
            this.SortFiles();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Sort the visible files according to our selected method
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.SortFiles = function () {
            if (!this.selectedDirectory || !this.selectedDirectory.files)
                return;
            if (this.fileSortType === "title" || this.fileSortType === "uploadDate")
                this.selectedDirectory.files = _.sortBy(this.selectedDirectory.files, this.fileSortType);
            if (this.filesSortDescend)
                this.selectedDirectory.files.reverse();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to create a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onCreateDirectoryClicked = function () {
            // Display the loading image
            this.isLoading = true;
            $("#CreateDirectoryButtonsPanel").hide();
            var directoryName = encodeURIComponent(this.newDirectoryName);
            var putUri = "/api/ManageDocuments/CreateDirectory?folderName=" + directoryName;
            // If we're creating a subdirectory
            putUri += "&parentFolderPath=";
            if (this.createUnderParentDirName)
                putUri += encodeURIComponent(this.createUnderParentDirName);
            var innerThis = this;
            this.$http.put(putUri, null).then(function () {
                // Clear the document cache
                innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                innerThis.newDirectoryName = "";
                innerThis.Refresh();
                innerThis.shouldShowCreateFolderModal = false;
                $("#CreateDirectoryButtonsPanel").show();
            }, function (httpResult) {
                var message = httpResult.data.exceptionMessage || httpResult.data.message || httpResult.data;
                alert("Failed to create the folder: " + message);
                innerThis.isLoading = false;
                $("#CreateDirectoryButtonsPanel").show();
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the cancel button when creating a new directory
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onCancelAddDirectory = function () {
            this.shouldShowCreateFolderModal = false;
            this.newDirectoryName = "";
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when a file gets clicked
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.onFileClicked = function (file) {
            this.selectedFile = file;
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to rename a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.RenameDocument = function (document) {
            if (!document)
                return;
            var newTitle = prompt("Enter the new name for the file", document.title);
            if (newTitle === null)
                return;
            if (newTitle.length > 64)
                newTitle = newTitle.substr(0, 64);
            // Display the loading image
            this.isLoading = true;
            var fileAction = {
                relativeS3Path: document.relativeS3Path,
                action: "rename",
                newTitle: newTitle,
                sourceFolderPath: this.getSelectedDirectoryPath(),
                destinationFolderPath: ""
            };
            var innerThis = this;
            this.$http.put("/api/ManageDocuments/RenameFile", fileAction).then(function () {
                // Clear the document cache
                innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                innerThis.Refresh();
            }, function () {
                innerThis.Refresh();
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.DeleteDocument = function (document) {
            if (confirm("Are you sure you want to delete this file?")) {
                // Display the loading image
                this.isLoading = true;
                var innerThis = this;
                this.$http.delete("/api/ManageDocuments?docPath=" + document.relativeS3Path).then(function () {
                    // Clear the document cache
                    innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                    innerThis.Refresh();
                }, function () {
                    innerThis.Refresh();
                });
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to edit a directory name
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.RenameSelectedDirectory = function () {
            if (!this.selectedDirectory)
                return;
            var newDirectoryName = prompt("Enter the new name for the directory", this.selectedDirectory.name);
            if (newDirectoryName === null)
                return;
            if (newDirectoryName.length > 32)
                newDirectoryName = newDirectoryName.substr(0, 32);
            // Display the loading image
            this.isLoading = true;
            var oldDirectoryPath = encodeURIComponent(this.getSelectedDirectoryPath());
            var newDirectoryNameQS = encodeURIComponent(newDirectoryName);
            var innerThis = this;
            this.$http.put("/api/ManageDocuments/RenameDirectory?directoryPath=" + oldDirectoryPath + "&newDirectoryName=" + newDirectoryNameQS, null).then(function () {
                // Clear the document cache
                innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                // Update the selected directory name so we can reselect it
                innerThis.selectedDirectory.name = newDirectoryName;
                innerThis.Refresh();
            }, function () {
                innerThis.Refresh();
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete a document
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.DeleteSelectedDirectory = function () {
            if (!this.selectedDirectory)
                return;
            if (this.selectedDirectory.files.length > 0) {
                alert("You can not delete a folder that contains files. Please delete or move all files from the folder.");
                return;
            }
            if (confirm("Are you sure you want to delete this folder?")) {
                // Display the loading image
                this.isLoading = true;
                var innerThis = this;
                var dirPath = this.getSelectedDirectoryPath();
                this.$http.delete("/api/ManageDocuments/DeleteDirectory?directoryPath=" + encodeURIComponent(dirPath)).then(function () {
                    // Clear the document cache
                    innerThis.$cacheFactory.get('$http').remove(innerThis.getDocsUri);
                    innerThis.Refresh();
                }, function (httpResult) {
                    innerThis.isLoading = false;
                    alert("Failed to delete the folder: " + httpResult.data.exceptionMessage);
                });
            }
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Get the icon for a file
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.getFileIcon = function (fileName) {
            if (!fileName)
                return "";
            var extension = fileName.split('.').pop().toLowerCase();
            var imagePath = null;
            switch (extension) {
                case "pdf":
                    imagePath = "PdfIcon.png";
                    break;
                case "doc":
                case "docx":
                    imagePath = "WordIcon.png";
                    break;
                case "xls":
                case "xlsx":
                    imagePath = "ExcelIcon.png";
                    break;
                case "jpeg":
                case "jpe":
                case "jpg":
                case "png":
                    imagePath = "ImageIcon.png";
                    break;
                case "zip":
                    imagePath = "ZipIcon.png";
                    break;
                default:
                    imagePath = "GenericFileIcon.png";
                    break;
            }
            return "/assets/images/FileIcons/" + imagePath;
        };
        DocumentsController.prototype.hookupParentDirs = function (dir) {
            var _this = this;
            dir.fullDirectoryPath = this.getDirectoryFullPath(dir);
            dir.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
            if (!dir.subdirectories)
                return;
            dir.subdirectories.forEach(function (subDir) {
                subDir.parentDirectory = dir;
                _this.hookupParentDirs(subDir);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Refresh the file tree
        ///////////////////////////////////////////////////////////////////////////////////////////////
        DocumentsController.prototype.Refresh = function () {
            // Store the name of the directory we have selected so we can re-select it after refreshing
            // the data
            var selectedDirectoryPath = null;
            if (this.selectedDirectory)
                selectedDirectoryPath = this.getSelectedDirectoryPath();
            // Display the loading image
            this.isLoading = true;
            this.selectedDirectory = null;
            this.selectedFile = null;
            this.getDocsUri = "/api/ManageDocuments";
            if (this.committee)
                this.getDocsUri += "/Committee/" + this.committee.committeeId;
            var innerThis = this;
            this.$http.get(this.getDocsUri, { cache: true }).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.documentTree = httpResponse.data;
                innerThis.documentTree.getSubDirectoryByName = DocumentDirectory.prototype.getSubDirectoryByName;
                // Hook up parent directories
                innerThis.documentTree.subdirectories.forEach(function (dir) {
                    innerThis.hookupParentDirs(dir);
                });
                // Build an array of all local files
                var allFiles = [];
                var processDir = function (subdir) {
                    _.each(subdir.files, function (f) {
                        f.localFilePath = subdir.name + "/" + f.title;
                        f.uploadDateString = moment(f.uploadDate).format("MMMM D, YYYY");
                    });
                    Array.prototype.push.apply(allFiles, subdir.files);
                    _.each(subdir.subdirectories, processDir);
                };
                processDir(innerThis.documentTree);
                innerThis.fullSearchFileList = allFiles;
                // Find the directory we had selected before the refresh
                if (selectedDirectoryPath) {
                    innerThis.selectedDirectory = innerThis.FindDirectoryByPath(selectedDirectoryPath);
                    innerThis.SortFiles();
                }
                innerThis.hookUpFileDragging();
            }, function (httpResponse) {
                innerThis.isLoading = false;
                //$( "#FileTreePanel" ).hide();
                //innerThis.errorMessage = "Failed to retrieve the building documents.";
            });
        };
        DocumentsController.$inject = ["$http", "$rootScope", "$cacheFactory", "$scope"];
        DocumentsController.LocalStorageKey_SortType = "DocsInfo_FileSortType";
        DocumentsController.LocalStorageKey_SortDirection = "DocsInfo_FileSortDirection";
        DocumentsController.DirName_Committees = "Committees_Root";
        return DocumentsController;
    }());
    Ally.DocumentsController = DocumentsController;
})(Ally || (Ally = {}));
CA.angularApp.component("documents", {
    bindings: {
        committee: "<"
    },
    templateUrl: "/ngApp/common/documents.html",
    controller: Ally.DocumentsController
});

var Ally;
(function (Ally) {
    var SendEmailRecpientEntry = /** @class */ (function () {
        function SendEmailRecpientEntry() {
        }
        return SendEmailRecpientEntry;
    }());
    var HomeEmailMessage = /** @class */ (function () {
        function HomeEmailMessage() {
            this.subject = "A message from your neighbor";
            this.recipientType = "board";
        }
        return HomeEmailMessage;
    }());
    /**
     * The controller for the widget that lets members send e-mails to the group
     */
    var GroupSendEmailController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function GroupSendEmailController($http, fellowResidents, $rootScope, siteInfo, $scope) {
            this.$http = $http;
            this.fellowResidents = fellowResidents;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$scope = $scope;
            this.isLoadingEmail = false;
            this.messageObject = new HomeEmailMessage();
            this.defaultMessageRecipient = "board";
            this.showDiscussionEveryoneWarning = false;
            this.showDiscussionLargeWarning = false;
            this.showSendConfirmation = false;
            this.showEmailForbidden = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        GroupSendEmailController.prototype.$onInit = function () {
            // The object that contains a message if the user wants to send one out
            this.messageObject = new HomeEmailMessage();
            this.showSendEmail = true;
            this.loadGroupEmails();
            var innerThis = this;
            this.$scope.$on("prepAssessmentEmailToBoard", function (event, data) { return innerThis.prepBadAssessmentEmailForBoard(data); });
        };
        /**
         * Populate the group e-mail options
         */
        GroupSendEmailController.prototype.loadGroupEmails = function () {
            this.isLoadingEmail = true;
            var innerThis = this;
            this.fellowResidents.getGroupEmailObject().then(function (emailList) {
                innerThis.isLoadingEmail = false;
                innerThis.availableEmailGroups = emailList;
                if (innerThis.availableEmailGroups.length > 0) {
                    innerThis.defaultMessageRecipient = innerThis.availableEmailGroups[0].recipientType;
                    innerThis.messageObject.recipientType = innerThis.defaultMessageRecipient;
                    innerThis.onSelectEmailGroup();
                }
            });
        };
        /**
         * Setup an e-mail to be sent to the board for assessment issues
         */
        GroupSendEmailController.prototype.prepBadAssessmentEmailForBoard = function (emitEventData) {
            var emitDataParts = emitEventData.split("|");
            var assessmentAmount = emitDataParts[0];
            var nextPaymentText = null;
            if (emitDataParts.length > 1)
                nextPaymentText = emitDataParts[1];
            // Create a message to the board
            this.messageObject.recipientType = "board";
            if (nextPaymentText)
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + assessmentAmount + " will cover " + nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        };
        /**
         * Occurs when the user presses the button to send an e-mail to members of the building
         */
        GroupSendEmailController.prototype.onSendEmail = function () {
            $("#message-form").validate();
            if (!$("#message-form").valid())
                return;
            this.isLoadingEmail = true;
            this.$rootScope.dontHandle403 = true;
            analytics.track("sendEmail", {
                recipientId: this.messageObject.recipientType
            });
            var innerThis = this;
            this.$http.post("/api/Email/v2", this.messageObject).then(function () {
                innerThis.$rootScope.dontHandle403 = false;
                innerThis.isLoadingEmail = false;
                innerThis.messageObject = new HomeEmailMessage();
                innerThis.messageObject.recipientType = innerThis.defaultMessageRecipient;
                innerThis.showSendConfirmation = true;
                innerThis.showSendEmail = false;
            }, function (httpResponse) {
                innerThis.isLoadingEmail = false;
                innerThis.$rootScope.dontHandle403 = false;
                if (httpResponse.status === 403) {
                    innerThis.showEmailForbidden = true;
                }
                else
                    alert("Unable to send e-mail, please contact technical support.");
            });
        };
        /**
         * Occurs when the user selects an e-mail group from the drop-down
         */
        GroupSendEmailController.prototype.onSelectEmailGroup = function () {
            var shortName = HtmlUtil.getSubdomain(window.location.host).toLowerCase();
            this.groupEmailAddress = this.messageObject.recipientType + "." + shortName + "@inmail.condoally.com";
            this.showDiscussionEveryoneWarning = this.messageObject.recipientType === "Everyone";
            var isSendingToOwners = this.messageObject.recipientType.toLowerCase().indexOf("owners") !== -1;
            if (!this.showDiscussionEveryoneWarning
                && isSendingToOwners
                && this.siteInfo.privateSiteInfo.numUnits > 30)
                this.showDiscussionLargeWarning = true;
            else
                this.showDiscussionLargeWarning = false;
        };
        GroupSendEmailController.$inject = ["$http", "fellowResidents", "$rootScope", "SiteInfo", "$scope"];
        return GroupSendEmailController;
    }());
    Ally.GroupSendEmailController = GroupSendEmailController;
})(Ally || (Ally = {}));
CA.angularApp.component("groupSendEmail", {
    templateUrl: "/ngApp/common/group-send-email.html",
    controller: Ally.GroupSendEmailController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members send e-mails to the group
     */
    var LocalNewsFeedController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function LocalNewsFeedController($http, siteInfo, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.isLoading = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        LocalNewsFeedController.prototype.$onInit = function () {
            // Load the news with a slight delay to help the page load faster
            this.isLoading = true;
            var innerThis = this;
            this.$timeout(function () { return innerThis.loadNewsStories(); }, 200);
        };
        /**
         * Refresh the local news feed
         */
        LocalNewsFeedController.prototype.loadNewsStories = function () {
            //window.location.host is subdomain.domain.com
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            // A little test to help the automated tests run faster
            var isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false;
            if (isTestSubdomain)
                return;
            this.isLoading = true;
            var localNewsUri;
            var queryParams;
            if (this.siteInfo.privateSiteInfo.country === "US") {
                localNewsUri = "https://localnewsally.org/api/LocalNews";
                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    chicagoWard: this.siteInfo.publicSiteInfo.chicagoWard,
                    zipCode: this.siteInfo.publicSiteInfo.zipCode,
                    cityNeighborhood: this.siteInfo.publicSiteInfo.localNewsNeighborhoodQuery
                };
            }
            else {
                localNewsUri = "https://localnewsally.org/api/LocalNews/International/MajorCity";
                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    countryCode: this.siteInfo.privateSiteInfo.country,
                    city: this.siteInfo.privateSiteInfo.groupAddress.city
                };
            }
            var innerThis = this;
            this.$http.get(localNewsUri, {
                cache: true,
                params: queryParams
            }).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.localNewStories = httpResponse.data;
            });
        };
        LocalNewsFeedController.$inject = ["$http", "SiteInfo", "$timeout"];
        return LocalNewsFeedController;
    }());
    Ally.LocalNewsFeedController = LocalNewsFeedController;
})(Ally || (Ally = {}));
CA.angularApp.component("localNewsFeed", {
    templateUrl: "/ngApp/common/local-news-feed.html",
    controller: Ally.LocalNewsFeedController
});

/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />
/// <reference path="../../Scripts/typings/underscore/underscore.d.ts" />
var Ally;
(function (Ally) {
    /**
     * Represents a street address
     */
    var SplitAddress = /** @class */ (function () {
        function SplitAddress() {
        }
        return SplitAddress;
    }());
    Ally.SplitAddress = SplitAddress;
    /**
     * Represents a GPS position, analgolous to TCCommonWeb.GpsPoint
     */
    var GpsPoint = /** @class */ (function () {
        function GpsPoint() {
        }
        return GpsPoint;
    }());
    Ally.GpsPoint = GpsPoint;
    /**
     * Represents a polygon with GPS coordinates for vertices, analgolous to TCCommonWeb.GpsPolygon
     */
    var GpsPolygon = /** @class */ (function () {
        function GpsPolygon() {
        }
        return GpsPolygon;
    }());
    Ally.GpsPolygon = GpsPolygon;
    /**
     * Represents a street address
     */
    var FullAddress = /** @class */ (function () {
        function FullAddress() {
        }
        return FullAddress;
    }());
    Ally.FullAddress = FullAddress;
    /**
     * Provides helper methods for dealing with map information
     */
    var MapUtil = /** @class */ (function () {
        function MapUtil() {
        }
        /**
         * Initialize the Google map on the page
         * @param addressComponents The address data returned from AutoComplete or a geocode
         */
        MapUtil.parseAddressComponents = function (addressComponents) {
            var splitAddress = new SplitAddress();
            var streetNumber = "";
            var streetName = "";
            for (var _i = 0, addressComponents_1 = addressComponents; _i < addressComponents_1.length; _i++) {
                var component = addressComponents_1[_i];
                if (component.types.indexOf("street_number") !== -1)
                    streetNumber = component.short_name;
                else if (component.types.indexOf("route") !== -1)
                    streetName = component.short_name;
                else if (component.types.indexOf("locality") !== -1)
                    splitAddress.city = component.short_name;
                else if (component.types.indexOf("administrative_area_level_1") !== -1)
                    splitAddress.state = component.short_name;
                else if (component.types.indexOf("postal_code") !== -1)
                    splitAddress.zip = component.short_name;
                else if (component.types.indexOf("country") !== -1)
                    splitAddress.country = component.short_name;
            }
            splitAddress.street = streetNumber + " " + streetName;
            return splitAddress;
        };
        /**
         * Convert Community Ally bounds to Google bounds
         * @param gpsBounds The array of
         */
        MapUtil.gpsBoundsToGooglePoly = function (gpsBounds) {
            var path = _.map(gpsBounds.vertices, function (v) {
                return new google.maps.LatLng(v.lat, v.lon);
            });
            return path;
        };
        ;
        return MapUtil;
    }());
    Ally.MapUtil = MapUtil;
})(Ally || (Ally = {}));

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../Common/map-util.ts" />
/// <reference path="preferred-vendors-ctrl.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for an individual vendor entry
     */
    var PreferredVendorItemController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PreferredVendorItemController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.isLoading = false;
            this.isSiteManager = false;
            this.isInEditMode = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        PreferredVendorItemController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.isAddForm = this.vendorItem == null;
            if (this.isAddForm) {
                this.isInEditMode = true;
                this.vendorItem = new Ally.PreferredVendor();
                this.editVendorItem = new Ally.PreferredVendor();
                // Wait until the page renders then hook up the autocomplete
                var innerThis = this;
                window.setTimeout(function () { innerThis.hookupAddressAutocomplete(); }, 500);
            }
        };
        /**
         * Attach the Google Places auto-complete logic to the address text box
         */
        PreferredVendorItemController.prototype.hookupAddressAutocomplete = function () {
            // Also mask phone numbers
            if (this.siteInfo.privateSiteInfo.country === "US" || this.siteInfo.privateSiteInfo.country === "CA") {
                var phoneFields = $(".mask-phone");
                phoneFields.mask("(999) 999-9999 ?x999");
            }
            // If we know our group's position, let's tighten the 
            var autocompleteOptions = undefined;
            if (this.siteInfo.privateSiteInfo.googleGpsPosition) {
                var TwentyFiveMilesInMeters = 40234;
                var circle = new google.maps.Circle({
                    center: this.siteInfo.privateSiteInfo.googleGpsPosition,
                    radius: TwentyFiveMilesInMeters
                });
                autocompleteOptions = {
                    bounds: circle.getBounds()
                };
            }
            var addressInput = document.getElementById("vendor-" + (this.vendorItem.preferredVendorId || "") + "-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, autocompleteOptions);
            var innerThis = this;
            google.maps.event.addListener(this.addressAutocomplete, "place_changed", function () {
                var place = innerThis.addressAutocomplete.getPlace();
                if (!innerThis.editVendorItem.fullAddress)
                    innerThis.editVendorItem.fullAddress = new Ally.FullAddress();
                innerThis.editVendorItem.fullAddress.oneLiner = place.formatted_address;
            });
        };
        /**
         * Called when the user clicks the button to save the new/edit vendor data
         */
        PreferredVendorItemController.prototype.onSaveVendor = function () {
            var _this = this;
            if (HtmlUtil.isNullOrWhitespace(this.editVendorItem.companyName)) {
                alert("Please enter a company name");
                return;
            }
            if (!this.editVendorItem.servicesTagArray || this.editVendorItem.servicesTagArray.length === 0) {
                alert("Please enter at least one service provided");
                return;
            }
            // Ensure the website starts properly
            if (!HtmlUtil.isNullOrWhitespace(this.editVendorItem.companyWeb)) {
                if (this.editVendorItem.companyWeb.indexOf("http") !== 0)
                    this.editVendorItem.companyWeb = "http://" + this.editVendorItem.companyWeb;
            }
            var saveMethod = this.editVendorItem.preferredVendorId == null ? this.$http.post : this.$http.put;
            this.isLoading = true;
            // Process ng-tag-input model into a pipe-separated string for the server
            var servicesProvidedString = "";
            _.each(this.editVendorItem.servicesTagArray, function (tag) {
                servicesProvidedString += "|" + tag.text;
            });
            servicesProvidedString += "|";
            this.editVendorItem.servicesProvided = servicesProvidedString;
            var innerThis = this;
            saveMethod("/api/PreferredVendors", this.editVendorItem).success(function () {
                innerThis.isLoading = false;
                if (_this.isAddForm) {
                    innerThis.editVendorItem = new Ally.PreferredVendor();
                    if (innerThis.onAddNewVendor)
                        innerThis.onAddNewVendor();
                }
                else
                    innerThis.isInEditMode = false;
                if (innerThis.onParentDataNeedsRefresh)
                    innerThis.onParentDataNeedsRefresh();
            }).error(function (exception) {
                innerThis.isLoading = false;
                alert("Failed to save the vendor information: " + exception.exceptionMessage);
            });
        };
        PreferredVendorItemController.prototype.onCancelEdit = function () {
            this.isInEditMode = false;
        };
        PreferredVendorItemController.prototype.onEditItem = function () {
            // Copy the vendor item
            this.editVendorItem = JSON.parse(JSON.stringify(this.vendorItem));
            this.isInEditMode = true;
            var innerThis = this;
            window.setTimeout(function () { innerThis.hookupAddressAutocomplete(); }, 500);
        };
        PreferredVendorItemController.prototype.deleteItem = function () {
            if (!confirm("Are you sure you want to remove this vendor?"))
                return;
            this.isLoading = true;
            var innerThis = this;
            this.$http.delete("/api/PreferredVendors/" + this.vendorItem.preferredVendorId).success(function () {
                innerThis.isLoading = false;
                if (innerThis.onParentDataNeedsRefresh)
                    innerThis.onParentDataNeedsRefresh();
            }).error(function (exception) {
                innerThis.isLoading = false;
                alert("Failed to delete the vendor: " + exception.exceptionMessage);
            });
        };
        PreferredVendorItemController.prototype.getServiceAutocomplete = function (enteredText) {
            return _.where(PreferredVendorItemController.AutocompleteServiceOptions, function (option) { return option.text.toLowerCase().indexOf(enteredText.toLowerCase()) !== -1; });
        };
        PreferredVendorItemController.$inject = ["$http", "SiteInfo"];
        PreferredVendorItemController.AutocompleteServiceOptions = [{ text: "Additions & Remodels" },
            { text: "Appliances" },
            { text: "Cabinets & Countertops" },
            { text: "Cleaning" },
            { text: "Concrete & Masonry" },
            { text: "Deck, Porch, & Gazebo" },
            { text: "Drywall & Insulation" },
            { text: "Electrical" },
            { text: "Fencing" },
            { text: "Flooring" },
            { text: "Garages" },
            { text: "Gutters" },
            { text: "Handy Man" },
            { text: "HVAC" },
            { text: "Landscaping, Lawn Care & Sprinklers" },
            { text: "Painting & Staining" },
            { text: "Pest Control" },
            { text: "Plumbing" },
            { text: "Remodeling" },
            { text: "Roofing" },
            { text: "Siding" },
            { text: "Snow Removal" },
            { text: "Solar Electric, Heating & Cooling" },
            { text: "Swimming Pools" },
            { text: "Windows & Doors" }];
        return PreferredVendorItemController;
    }());
    Ally.PreferredVendorItemController = PreferredVendorItemController;
})(Ally || (Ally = {}));
CA.angularApp.component("preferredVendorItem", {
    bindings: {
        vendorItem: "=?",
        onParentDataNeedsRefresh: "&?",
        onAddNewVendor: "&?"
    },
    templateUrl: "/ngApp/common/preferred-vendor-item.html",
    controller: Ally.PreferredVendorItemController
});

/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Scripts/typings/moment/moment.d.ts" />
/// <reference path="../Services/html-util.ts" />
/// <reference path="../Common/map-util.ts" />
var Ally;
(function (Ally) {
    var PreferredVendor = /** @class */ (function () {
        function PreferredVendor() {
            this.fullAddress = new Ally.FullAddress();
        }
        return PreferredVendor;
    }());
    Ally.PreferredVendor = PreferredVendor;
    /**
     * The controller for the vendors page
     */
    var PreferredVendorsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function PreferredVendorsController($http, siteInfo) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.allVendors = [];
            this.filteredVendors = [];
            this.editVendor = new PreferredVendor();
            this.isLoading = false;
            this.isSiteManager = false;
            this.usedServiceTags = [];
            this.filterTags = [];
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        PreferredVendorsController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.retrieveVendors();
        };
        /**
         * Populate the vendors
         */
        PreferredVendorsController.prototype.retrieveVendors = function () {
            this.isLoading = true;
            var innerThis = this;
            this.$http.get("/api/PreferredVendors").success(function (vendors) {
                innerThis.isLoading = false;
                innerThis.allVendors = vendors;
                innerThis.filteredVendors = vendors;
                // Process the tags into an array for the ng-tag-input control, build the list of
                // all used tags, and convert the add dates to local time
                innerThis.usedServiceTags = [];
                _.each(innerThis.allVendors, function (v) {
                    v.servicesTagArray = [];
                    _.each(v.servicesProvidedSplit, function (ss) { return v.servicesTagArray.push({ text: ss }); });
                    innerThis.usedServiceTags = innerThis.usedServiceTags.concat(v.servicesProvidedSplit);
                    // Convert the added timestamps to local time
                    v.addedDateUtc = moment.utc(v.addedDateUtc).toDate();
                });
                // Remove any duplicate tags
                innerThis.usedServiceTags = _.uniq(innerThis.usedServiceTags);
                innerThis.usedServiceTags.sort();
            });
        };
        PreferredVendorsController.prototype.onTagFilterToggle = function (tagName) {
            // Add if the tag to our filter list if it's not there, remove it if it is
            var tagCurrentIndex = this.filterTags.indexOf(tagName);
            if (tagCurrentIndex === -1)
                this.filterTags.push(tagName);
            else
                this.filterTags.splice(tagCurrentIndex, 1);
            if (this.filterTags.length === 0)
                this.filteredVendors = this.allVendors;
            else {
                this.filteredVendors = [];
                // Grab any vendors that have one of the tags by which we're filtering
                var innerThis = this;
                _.each(this.allVendors, function (v) {
                    if (_.intersection(v.servicesProvidedSplit, innerThis.filterTags).length > 0)
                        innerThis.filteredVendors.push(v);
                });
            }
        };
        PreferredVendorsController.prototype.onAddedNewVendor = function () {
            this.retrieveVendors();
        };
        PreferredVendorsController.$inject = ["$http", "SiteInfo"];
        return PreferredVendorsController;
    }());
    Ally.PreferredVendorsController = PreferredVendorsController;
})(Ally || (Ally = {}));
CA.angularApp.component("preferredVendors", {
    templateUrl: "/ngApp/common/preferred-vendors.html",
    controller: Ally.PreferredVendorsController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the HOA info wrapper page
     */
    var HoaInfoController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HoaInfoController($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.isSiteManager = false;
            this.hideDocuments = false;
            this.selectedView = "docs";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HoaInfoController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.hideDocuments = this.siteInfo.userInfo.isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            if (this.hideDocuments)
                this.selectedView = "info";
            else
                this.selectedView = "docs";
        };
        HoaInfoController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
        return HoaInfoController;
    }());
    Ally.HoaInfoController = HoaInfoController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaInfo", {
    templateUrl: "/ngApp/hoa/member/HoaInfo.html",
    controller: Ally.HoaInfoController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../Services/html-util.ts" />
var Ally;
(function (Ally) {
    /**
     * The controller for the HOA Ally home page
     */
    var HoaHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HoaHomeController($http, siteInfo, $cacheFactory) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.isSiteManager = false;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HoaHomeController.prototype.$onInit = function () {
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
        };
        HoaHomeController.$inject = ["$http", "SiteInfo", "$cacheFactory"];
        return HoaHomeController;
    }());
    Ally.HoaHomeController = HoaHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("hoaHome", {
    templateUrl: "/ngApp/hoa/member/Home.html",
    controller: Ally.HoaHomeController
});

var Ally;
(function (Ally) {
    /**
     * The controller for the Home Ally home page
     */
    var HomeGroupHomeController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function HomeGroupHomeController($http, $rootScope, siteInfo, $timeout, appCacheService) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.appCacheService = appCacheService;
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        HomeGroupHomeController.prototype.$onInit = function () {
            this.welcomeMessage = this.siteInfo.privateSiteInfo.welcomeMessage;
            this.isFirstVisit = this.siteInfo.userInfo.lastLoginDateUtc === null;
            this.isSiteManager = this.siteInfo.userInfo.isSiteManager;
            this.showFirstVisitModal = this.isFirstVisit && !this.$rootScope.hasClosedFirstVisitModal && this.siteInfo.privateSiteInfo.siteLaunchedDateUtc === null;
            this.homeRightColumnType = this.siteInfo.privateSiteInfo.homeRightColumnType;
            if (!this.homeRightColumnType)
                this.homeRightColumnType = "localnews";
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            this.allyAppName = AppConfig.appName;
            var MaxNumRecentPayments = 6;
            this.recentPayments = this.siteInfo.userInfo.recentPayments;
            if (this.recentPayments) {
                if (this.recentPayments.length > MaxNumRecentPayments)
                    this.recentPayments = this.recentPayments.slice(0, MaxNumRecentPayments);
                this.numRecentPayments = this.recentPayments.length;
                // Fill up the list so there's always MaxNumRecentPayments
                while (this.recentPayments.length < MaxNumRecentPayments)
                    this.recentPayments.push({});
            }
            // The object that contains a message if the user wants to send one out
            this.messageObject = {};
            // If the user lives in a unit and assessments are enabled
            if (this.siteInfo.privateSiteInfo.assessmentFrequency !== null
                && this.siteInfo.userInfo.usersUnits !== null
                && this.siteInfo.userInfo.usersUnits.length > 0) {
                this.paymentInfo.paymentType = "periodic";
                if (this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                    this.knowsNextPayment = true;
                    this.errorPayInfoText = "Is the amount or date incorrect?";
                    this.nextPaymentText = this.getNextPaymentText(this.siteInfo.userInfo.usersUnits[0].nextAssessmentDue, this.siteInfo.privateSiteInfo.assessmentFrequency);
                    this.updatePaymentText();
                }
            }
            this.refreshData();
        };
        // Refresh the not text for the payment field
        HomeGroupHomeController.prototype.updatePaymentText = function () {
            if (this.paymentInfo.paymentType === "periodic" && this.siteInfo.privateSiteInfo.isPeriodicPaymentTrackingEnabled) {
                // If we have a next payment string
                if (!HtmlUtil.isNullOrWhitespace(this.nextPaymentText)) {
                    if (this.siteInfo.userInfo.usersUnits[0].includesLateFee)
                        this.paymentInfo.note = "Assessment payment with late fee for ";
                    else
                        this.paymentInfo.note = "Assessment payment for ";
                    this.paymentInfo.note += this.nextPaymentText;
                }
            }
            else {
                this.paymentInfo.note = "";
            }
        };
        HomeGroupHomeController.prototype.onSelectPaymentType = function (paymentType) {
            this.paymentInfo.paymentType = paymentType;
            this.paymentInfo.amount = paymentType === "periodic" ? this.siteInfo.userInfo.assessmentAmount : 0;
            this.updatePaymentText();
        };
        HomeGroupHomeController.prototype.getNextPaymentText = function (payPeriods, assessmentFrequency) {
            if (payPeriods === null)
                return "";
            // Ensure the periods is an array
            if (payPeriods.constructor !== Array)
                payPeriods = [payPeriods];
            var paymentText = "";
            var frequencyInfo = FrequencyIdToInfo(assessmentFrequency);
            for (var periodIndex = 0; periodIndex < payPeriods.length; ++periodIndex) {
                var curPeriod = payPeriods[periodIndex];
                if (frequencyInfo.intervalName === "month") {
                    var monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
                    paymentText = monthNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "quarter") {
                    var quarterNames = ["Q1", "Q2", "Q3", "Q4"];
                    paymentText = quarterNames[curPeriod.period - 1];
                }
                else if (frequencyInfo.intervalName === "half-year") {
                    var halfYearNames = ["First Half", "Second Half"];
                    paymentText = halfYearNames[curPeriod.period - 1];
                }
                paymentText += " " + curPeriod.year;
                this.paymentInfo.paysFor = [curPeriod];
            }
            return paymentText;
        };
        HomeGroupHomeController.prototype.hideFirstVisit = function () {
            this.$rootScope.hasClosedFirstVisitModal = true;
            this.showFirstVisitModal = false;
        };
        HomeGroupHomeController.prototype.onIncorrectPayDetails = function () {
            // Create a message to the board
            this.messageObject.recipientType = "board";
            if (this.knowsNextPayment)
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " will cover " + this.nextPaymentText + ", but I believe that is incorrect. My records indicate my next payment of $" + this.siteInfo.userInfo.assessmentAmount + " should pay for [INSERT PROPER DATE HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            else
                this.messageObject.message = "Hello Boardmembers,\n\nOur association's home page says my assessment payment is $" + this.siteInfo.userInfo.assessmentAmount + ", but I believe that is incorrect. My records indicate my assessment payments should be $[INSERT PROPER AMOUNT HERE]. What do you need from me to resolve the issue?\n\n- " + this.siteInfo.userInfo.firstName;
            document.getElementById("send-email-panel").scrollIntoView();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the page from the server
        ///////////////////////////////////////////////////////////////////////////////////////////////
        HomeGroupHomeController.prototype.refreshData = function () {
            //window.location.host is subdomain.domain.com
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            // A little test to help the automated tests run faster
            var isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false;
            if (!isTestSubdomain && this.homeRightColumnType === "localnews") {
                this.isLoading_LocalNews = true;
                var localNewsUri;
                var queryParams;
                if (this.siteInfo.privateSiteInfo.country === "US") {
                    localNewsUri = "https://localnewsally.org/api/LocalNews";
                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        chicagoWard: this.siteInfo.publicSiteInfo.chicagoWard,
                        zipCode: this.siteInfo.publicSiteInfo.zipCode,
                        cityNeighborhood: this.siteInfo.publicSiteInfo.localNewsNeighborhoodQuery
                    };
                }
                else {
                    localNewsUri = "https://localnewsally.org/api/LocalNews/International/MajorCity";
                    queryParams = {
                        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                        countryCode: this.siteInfo.privateSiteInfo.country,
                        city: this.siteInfo.privateSiteInfo.groupAddress.city
                    };
                }
                var innerThis = this;
                this.$http.get(localNewsUri, {
                    cache: true,
                    params: queryParams
                }).then(function (httpResponse) {
                    innerThis.localNews = httpResponse.data;
                    innerThis.isLoading_LocalNews = false;
                });
            }
        };
        HomeGroupHomeController.$inject = ["$http", "$rootScope", "SiteInfo", "$timeout", "appCacheService"];
        return HomeGroupHomeController;
    }());
    Ally.HomeGroupHomeController = HomeGroupHomeController;
})(Ally || (Ally = {}));
CA.angularApp.component("homeGroupHome", {
    templateUrl: "/ngApp/home/home-group-home.html",
    controller: Ally.HomeGroupHomeController
});

/// <reference path="../../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../../../Scripts/typings/googlemaps/google.maps.d.ts" />
var Ally;
(function (Ally) {
    var SignerUpInfo = /** @class */ (function () {
        function SignerUpInfo() {
        }
        return SignerUpInfo;
    }());
    var SignUpInfo = /** @class */ (function () {
        function SignUpInfo() {
            this.streetAddress = "";
            this.signerUpInfo = new SignerUpInfo();
            this.homeInfo = {};
        }
        return SignUpInfo;
    }());
    var LotSizeType_Acres = "Acres";
    var LotSizeType_SquareFeet = "SquareFeet";
    var SquareFeetPerAcre = 43560;
    /**
     * The controller for the Home Ally sign-up page
     */
    var HomeSignUpController = /** @class */ (function () {
        /**
         * The constructor for the class
         * @param $http The HTTP service object
         * @param $scope The Angular scope object
         */
        function HomeSignUpController($http, $scope, WizardHandler) {
            this.$http = $http;
            this.$scope = $scope;
            this.WizardHandler = WizardHandler;
            this.lotSizeUnit = LotSizeType_Acres;
            this.lotSquareUnits = 0;
            this.signUpInfo = new SignUpInfo();
            this.isLoadingHomeInfo = false;
            this.didLoadHomeInfo = false;
            this.isLoading = false;
            this.hideWizard = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        HomeSignUpController.prototype.$onInit = function () {
            var _this = this;
            // The controller is ready, but let's wait a bit for the page to be ready
            var innerThis = this;
            setTimeout(function () { _this.initMap(); }, 300);
        };
        /**
         * Initialize the Google map on the page
         */
        HomeSignUpController.prototype.initMap = function () {
            var mapDiv = document.getElementById("address-map");
            this.map = new google.maps.Map(mapDiv, {
                center: { lat: 41.869638, lng: -87.657423 },
                zoom: 9
            });
            this.mapMarker = new google.maps.Marker({
                map: this.map,
                anchorPoint: new google.maps.Point(41.969638, -87.657423),
                icon: "/assets/images/MapMarkers/MapMarker_Home.png",
                position: null
            });
            var addressInput = document.getElementById("home-address-text-box");
            this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput);
            this.addressAutocomplete.bindTo('bounds', this.map);
            // Occurs when the user selects a Google suggested address
            var innerThis = this;
            this.addressAutocomplete.addListener('place_changed', function () {
                //innerThis.setPlaceWasSelected();
                //infowindow.close();
                innerThis.mapMarker.setVisible(false);
                var place = innerThis.addressAutocomplete.getPlace();
                var readableAddress = place.formatted_address;
                // Remove the trailing country if it's USA
                if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                    readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                innerThis.signUpInfo.streetAddress = readableAddress;
                innerThis.selectedSplitAddress = Ally.MapUtil.parseAddressComponents(place.address_components);
                innerThis.prepopulateHomeInfo();
                if (place.geometry)
                    innerThis.centerMap(place.geometry);
                $("#association-name-text-box").focus();
            });
        };
        /**
         * Called when the user completes the wizard
         */
        HomeSignUpController.prototype.onFinishedWizard = function () {
            if (this.lotSizeUnit === LotSizeType_Acres)
                this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits * SquareFeetPerAcre;
            else
                this.signUpInfo.homeInfo.lotSquareFeet = this.lotSquareUnits;
            this.isLoading = true;
            var innerThis = this;
            this.$http.post("/api/HomeSignUp", this.signUpInfo).then(function (httpResponse) {
                innerThis.isLoading = false;
                var signUpResult = httpResponse.data;
                // If we successfully created the site
                if (!HtmlUtil.isNullOrWhitespace(signUpResult.errorMessage)) {
                    alert("Failed to complete sign-up: " + signUpResult.errorMessage);
                    if (signUpResult.stepIndex >= 0)
                        innerThis.WizardHandler.wizard().goTo(signUpResult.stepIndex);
                }
                else if (!HtmlUtil.isNullOrWhitespace(signUpResult.createUrl)) {
                    window.location.href = signUpResult.createUrl;
                }
                else {
                    innerThis.hideWizard = true;
                    innerThis.resultMessage = "Great work! We just sent you an e-mail with instructions on how access your new site.";
                }
            }, function (httpResponse) {
                innerThis.isLoading = false;
                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert("Failed to complete sign-up: " + errorMessage);
            });
        };
        /**
         * Called when the user types in a new street address
         */
        HomeSignUpController.prototype.onHomeAddressChanged = function () {
            var innerThis = this;
            HtmlUtil.geocodeAddress(this.signUpInfo.streetAddress, function (results, status) {
                innerThis.$scope.$apply(function () {
                    if (status != google.maps.GeocoderStatus.OK) {
                        //$( "#GeocodeResultPanel" ).text( "Failed to find address for the following reason: " + status );
                        return;
                    }
                    var readableAddress = results[0].formatted_address;
                    // Remove the trailing country if it's USA
                    if (readableAddress.indexOf(", USA") === readableAddress.length - ", USA".length)
                        readableAddress = readableAddress.substring(0, readableAddress.length - ", USA".length);
                    innerThis.signUpInfo.streetAddress = readableAddress;
                    innerThis.centerMap(results[0].geometry);
                });
            });
        };
        /**
         * Center the map on a position
         * @param geometry The geometry on which to center
         */
        HomeSignUpController.prototype.centerMap = function (geometry) {
            // If the place has a geometry, then present it on a map.
            if (geometry.viewport) {
                this.map.fitBounds(geometry.viewport);
            }
            else {
                this.map.setCenter(geometry.location);
                this.map.setZoom(17); // Why 17? Because it looks good.
            }
            this.mapMarker.setPosition(geometry.location);
            this.mapMarker.setVisible(true);
        };
        /**
         * Retrieve the home information from the server
         */
        HomeSignUpController.prototype.prepopulateHomeInfo = function () {
            if (!this.selectedSplitAddress)
                return;
            this.isLoadingHomeInfo = true;
            var getUri = "/api/PropertyResearch/HomeInfo?street=" + encodeURIComponent(this.selectedSplitAddress.street) + "&city=" + encodeURIComponent(this.selectedSplitAddress.city) + "&state=" + this.selectedSplitAddress.state + "&zip=" + this.selectedSplitAddress.zip;
            var innerThis = this;
            this.$http.get(getUri).then(function (httpResponse) {
                innerThis.isLoadingHomeInfo = false;
                var homeInfo = httpResponse.data;
                if (homeInfo) {
                    innerThis.didLoadHomeInfo = true;
                    innerThis.signUpInfo.homeInfo = homeInfo;
                    if (homeInfo.lotSquareFeet) {
                        // Choose a square feet that makes sense
                        if (homeInfo.lotSquareFeet > SquareFeetPerAcre) {
                            innerThis.lotSizeUnit = LotSizeType_Acres;
                            innerThis.lotSquareUnits = homeInfo.lotSquareFeet / SquareFeetPerAcre;
                            // Round to nearest .25
                            innerThis.lotSquareUnits = parseFloat((Math.round(innerThis.lotSquareUnits * 4) / 4).toFixed(2));
                        }
                        else {
                            innerThis.lotSizeUnit = LotSizeType_SquareFeet;
                            innerThis.lotSquareUnits = homeInfo.lotSquareFeet;
                        }
                    }
                }
            }, function () {
                innerThis.isLoadingHomeInfo = false;
            });
        };
        HomeSignUpController.$inject = ["$http", "$scope", "WizardHandler"];
        return HomeSignUpController;
    }());
    Ally.HomeSignUpController = HomeSignUpController;
})(Ally || (Ally = {}));
CA.angularApp.component('homeSignUp', {
    templateUrl: "/ngApp/home/public/SignUp.html",
    controller: Ally.HomeSignUpController
});

function ServiceBankInfoCtrl( $http )
{
    var vm = this;
}
ServiceBankInfoCtrl.$inject = ["$http"];

function ServiceBusinessInfoCtrl( $http )
{
    var vm = this;
}
ServiceBusinessInfoCtrl.$inject = ["$http"];

function ServiceJobsCtrl( $http )
{
    var vm = this;
}
ServiceJobsCtrl.$inject = ["$http"];

CA.angularApp.directive( "groupComments", ["$http", "$rootScope", function( $http, $rootScope )
{
    function CommentController()
    {
        var ctrlVM = this;

        ctrlVM.threadId = "Home";

        ctrlVM.isQaSite = HtmlUtil.getSubdomain() === "qa" || HtmlUtil.getSubdomain() === "localtest";


        ctrlVM.editComment = {
            threadId: ctrlVM.threadId,
            commentText: "",
            replyToCommentId: null
        };


        ctrlVM.displayDiscussModal = function()
        {
            ctrlVM.showDiscussModal = true;
        };

        ctrlVM.hideDiscussModal = function()
        {
            //TODO put in a delay before we allow close to avoid the mobile tap-open-close issue
            ctrlVM.showDiscussModal = false;
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////////
        // Retrieve the comments from the server for the current thread
        ctrlVM.refreshComments = function()
        {
            ctrlVM.isLoading = true;

            $http.get( "/api/Comment?threadId=" + ctrlVM.threadId ).then( function( httpResponse )
            {
                ctrlVM.isLoading = false;
                ctrlVM.commentList = httpResponse.data;

                var markDates = function( c )
                {
                    c.postDateUtc = moment.utc( c.postDateUtc ).toDate();

                    if( c.lastEditDateUtc )
                        c.lastEditDateUtc = moment.utc( c.lastEditDateUtc ).toDate();

                    if( c.deletedDateUtc )
                        c.deletedDateUtc = moment.utc( c.deletedDateUtc ).toDate();

                    c.isMyComment = c.authorUserId === $rootScope.userInfo.userId;

                    if( c.replies )
                        _.each( c.replies, markDates );
                };

                // Convert the UTC dates to local dates and mark the user's comments
                _.each( ctrlVM.commentList, markDates );

            }, function()
            {
                ctrlVM.isLoading = false;
            } );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.postComment = function( commentData )
        {
            ctrlVM.isLoading = true;

            var httpFunc = $http.post;
            if( typeof ( commentData.existingCommentId ) === "number" )
                httpFunc = $http.put;

            httpFunc( "/api/Comment", commentData ).then( function()
            {
                ctrlVM.isLoading = false;
                ctrlVM.editComment = {};
                ctrlVM.showReplyBoxId = -1;
                ctrlVM.refreshComments();

            }, function( data )
            {
                ctrlVM.isLoading = false;

                var errorMessage = !!data.exceptionMessage ? data.exceptionMessage : data;
                alert( "Failed to post comment: " + errorMessage );
            } );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment to the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.onPostCommentClicked = function()
        {
            if( ctrlVM.editComment.commentText.length === 0 )
                return;

            // Copy the object to avoid updating the UI
            var commentData = {
                threadId: ctrlVM.threadId,
                commentText: ctrlVM.editComment.commentText,
                replyToCommentId: null,
                existingCommentId: ctrlVM.editComment.existingCommentId
            };

            ctrlVM.postComment( commentData );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Edit an existing comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.editMyComment = function( comment )
        {
            ctrlVM.editComment = {
                commentText: comment.commentText,
                existingCommentId: comment.commentId
            };
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Delete a comment
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.deleteMyComment = function( comment )
        {
            ctrlVM.isLoading = true;

            $http.delete( "/api/Comment?commentId=" + comment.commentId ).then( function()
            {
                ctrlVM.isLoading = false;
                ctrlVM.refreshComments();

            }, function( httpResponse )
            {
                ctrlVM.isLoading = false;

                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                alert( "Failed to post comment: " + errorMessage );
            } );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Add a comment in response to a comment in the current thread
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.onPostReplyCommentClicked = function()
        {
            if( ctrlVM.editComment.replyText.length === 0 )
                return;

            // Copy the object to avoid updating the UI
            var commentData = {
                threadId: ctrlVM.threadId,
                commentText: ctrlVM.editComment.replyText,
                replyToCommentId: ctrlVM.editComment.replyToCommentId
            };

            ctrlVM.postComment( commentData );
        };


        ///////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user clicks the button to reply
        ///////////////////////////////////////////////////////////////////////////////////////////
        ctrlVM.clickReplyToComment = function( commentId )
        {
            ctrlVM.showReplyBoxId = commentId;

            ctrlVM.editComment = {
                commentText: "",
                replyToCommentId: commentId
            };
        };

        ctrlVM.refreshComments();
    };

    return {
        scope: {},
        restrict: 'E',
        replace: 'true',
        controllerAs: 'ctrlVM',
        templateUrl: '/ngApp/Services/CommentDirectiveTemplate.html',
        controller: CommentController
    };
}] );
CA.angularApp.directive( "googleMapPolyEditor", ["$http", function ( $http )
{
    var linkFunction = function ( scope, elem, attrs )
    {
        scope.mapInfo = {
            center: { lat: 39.5, lng: -98.35 },
            zoom: 4, // 19=House level, 4=USA fills
            disableDefaultUI: !scope.enableMapControls,
            mapTypeId: google.maps.MapTypeId.HYBRID,
            events: {
                // Occurs whenever tiles are loaded, but we disable the listener after the first so
                // this acts as an onLoaded handler
                tilesloaded: function ( map, eventName, args )
                {
                    // We only need to handle this event once to grab the map instance so don't listen again
                    google.maps.event.clearListeners( map, "tilesloaded" );
                }
            }
        };

        // Convert Google bounds to a Community Ally GpsBounds object
        scope.googlePolyToGpsBounds = function ( verts )
        {
            verts = _.map( verts, function ( v )
            {
                return { lat: v.lat(), lon: v.lng() };
            } );

            return verts;
        };


        scope.centerMapOnPoly = function ( verts )
        {
            if( !verts || verts.length === 0 )
                return;

            //  Create a new viewpoint bound
            var bounds = new google.maps.LatLngBounds();

            _.map( verts, function ( v )
            {
                bounds.extend( v );
            } );
            
            //  Fit these bounds to the map
            scope.mapInstance.fitBounds( bounds );
        };
        

        // Add the polygon that shows the current group's bounds
        scope.setGroupBounds = function ( groupBounds )
        {
            // If there is already a group shape then clear it
            if ( !groupBounds )
            {
                if ( scope.groupBoundsShape )
                {
                    scope.groupBoundsShape.setMap( null );
                    scope.groupBoundsShape = null;
                }

                return;
            }

            var path = Ally.MapUtil.gpsBoundsToGooglePoly( groupBounds );

            var polylineOptions = {
                paths: path,
                map: scope.mapInstance,
                strokeColor: '#0000FF',
                strokeOpacity: 0.5,
                strokeWeight: 1,
                fillColor: '#0000FF',
                fillOpacity: 0.15,
                zIndex:-1
            };

            if ( scope.activeShape )
                scope.activeShape.setMap( null );

            scope.groupBoundsShape = new google.maps.Polygon( polylineOptions );
        };

        // Make the map include all visible polygons
        scope.fitBoundsForPolys = function ()
        {
            var viewBounds = new google.maps.LatLngBounds();

            if( !scope.groupBoundsShape && ( !scope.currentVisiblePolys || scope.currentVisiblePolys.length === 0 ) )
                return;

            if ( scope.groupBoundsShape )
            {
                _.each( scope.groupBoundsShape.getPath().getArray(), function ( p )
                {
                    viewBounds.extend( p );
                } );
            }

            _.each( scope.currentVisiblePolys, function ( shape )
            {
                _.each( shape.getPath().getArray(), function ( p )
                {
                    viewBounds.extend( p );
                } );
            } );

            scope.mapInstance.fitBounds( viewBounds );
        };


        // Make the map include all visible points
        scope.fitBoundsForPoints = function ()
        {
            if( !scope.currentVisiblePoints || scope.currentVisiblePoints.length === 0 )
                return;

            var viewBounds = new google.maps.LatLngBounds();

            _.each( scope.currentVisiblePoints, function ( p )
            {
                viewBounds.extend( p.position );
            } );

            scope.mapInstance.fitBounds( viewBounds );
        };


        // Occurs when a polygon point has been moved and adds the delete button
        var onPointUpdatedAddDelete = function ( index )
        {
            var getDeleteButton = function( imageUrl ) { return $( "img[src$='" + imageUrl + "']" ); };

            var path = this;
            var btnDelete = getDeleteButton( path.btnDeleteImageUrl );

            if ( btnDelete.length === 0 )
            {
                var undoimg = $( "img[src$='http://maps.gstatic.com/mapfiles/undo_poly.png']" );

                undoimg.parent().css( 'height', '21px !important' );
                undoimg.parent().parent().append( '<div style="overflow-x: hidden; overflow-y: hidden; position: absolute; width: 30px; height: 27px;top:21px;"><img src="' + path.btnDeleteImageUrl + '" class="deletePoly" style="height:auto; width:auto; position: absolute; left:0;"/></div>' );

                // now get that button back again!
                btnDelete = getDeleteButton( path.btnDeleteImageUrl );
                btnDelete.hover( function () { $( this ).css( 'left', '-30px' ); return false; },
                    function () { $( this ).css( 'left', '0px' ); return false; } );
                btnDelete.mousedown( function () { $( this ).css( 'left', '-60px' ); return false; } );
            }

            // if we've already attached a handler, remove it
            if ( path.btnDeleteClickHandler )
                btnDelete.unbind( 'click', path.btnDeleteClickHandler );

            // now add a handler for removing the passed in index
            path.btnDeleteClickHandler = function ()
            {
                path.removeAt( index );
                return false;
            };
            btnDelete.click( path.btnDeleteClickHandler );
        };


        // Add the button to delete vertices on a polygon that's being edited
        var addDeleteButton = function ( poly, imageUrl )
        {
            var path = poly.getPath();
            path["btnDeleteClickHandler"] = {};
            path["btnDeleteImageUrl"] = imageUrl;

            google.maps.event.addListener( poly.getPath(), 'set_at', onPointUpdatedAddDelete );
            google.maps.event.addListener( poly.getPath(), 'insert_at', onPointUpdatedAddDelete );
        };

        scope.currentVisiblePolys = [];
        scope.currentVisiblePoints = [];

        // Occurs when the GpsBounds to the non-editable polys change
        scope.onVisiblePolysChange = function ( newPolys )
        {
            // Clear our current array
            _.each( scope.currentVisiblePolys, function ( p )
            {
                p.setMap( null );
            } );
            scope.currentVisiblePolys = [];

            _.each( newPolys, function ( p )
            {
                var path = Ally.MapUtil.gpsBoundsToGooglePoly( p );

                var polylineOptions = {
                    paths: path,
                    clickable: typeof(p.onClick) === "function",
                    map: scope.mapInstance,
                    strokeColor: '#0000FF',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#0000FF',
                    fillOpacity: 0.35,
                };

                var newShape = new google.maps.Polygon( polylineOptions );
                newShape.polyInfo = p;
                p.mapShapeObject = newShape;
                scope.currentVisiblePolys.push( newShape );

                if( polylineOptions.clickable )
                {
                    google.maps.event.addListener( newShape, 'click', function ()
                    {
                        newShape.polyInfo.onClick();
                    } );
                }
            } );

            scope.fitBoundsForPolys();
        };


        // Occurs when the GpsBounds to the non-editable polys change
        scope.onVisiblePointsChange = function ( newPoints )
        {
            // Clear our current array
            _.each( scope.currentVisiblePoints, function ( p )
            {
                p.setMap( null );
            } );
            scope.currentVisiblePoints = [];

            _.each( newPoints, function ( p )
            {
                var newMarker = new google.maps.Marker( {
                    position: { lat: p.lat, lng: p.lon },
                    map: scope.mapInstance,
                    title: p.fullAddress
                } );

                newMarker.pointSource = p;

                scope.currentVisiblePoints.push( newMarker );

                if( typeof(p.onClick) === "function" )
                {
                    google.maps.event.addListener( newMarker, 'click', function ()
                    {
                        newMarker.pointSource.onClick();
                    } );
                }
            } );

            scope.fitBoundsForPoints();
        };


        // Occurs when the GpsBounds we're editing change
        scope.onEditPolyChange = function ( newGpsBounds )
        {
            if ( !newGpsBounds )
            {
                if ( scope.activeShape )
                    scope.activeShape.setMap( null );
                scope.activeShape = null;

                return;
            }

            var path = _.map( newGpsBounds.vertices, function ( v )
            {
                return new google.maps.LatLng( v.lat, v.lon );
            } );

            scope.centerMapOnPoly( path );

            var polylineOptions = {
                paths: path,
                editable: true,
                draggable: true,
                clickable: true,
                map: scope.mapInstance,
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35,
            };

            if ( scope.activeShape )
                scope.activeShape.setMap( null );

            scope.activeShape = new google.maps.Polygon( polylineOptions );
            
            var onPointUpdated = function ()
            {
                scope.editPolyVerts.vertices = scope.googlePolyToGpsBounds( scope.activeShape.getPath().getArray() );
            };

            google.maps.event.addListener( scope.activeShape.getPath(), 'set_at', onPointUpdated );
            google.maps.event.addListener( scope.activeShape.getPath(), 'insert_at', onPointUpdated );

            addDeleteButton( scope.activeShape, 'http://i.imgur.com/RUrKV.png' );

            return scope.activeShape;
        };


        // detect outside changes and update our input
        scope.$watch( 'editPolyVerts', function ( newPoly )
        {
            scope.onEditPolyChange( newPoly );
        } );

        scope.$watch( 'visiblePolys', function ( newPolys )
        {
            scope.onVisiblePolysChange( newPolys );
        } );

        scope.$watch( 'visiblePoints', function ( newPoints )
        {
            scope.onVisiblePointsChange( newPoints );
        } );

        scope.$watch( 'groupBoundsPoly', function ( newGroupBoundsPoly )
        {
            scope.setGroupBounds( newGroupBoundsPoly );
        } );

        scope.$watch( 'mapCenter', function ( newMapCenter )
        {
            if( !newMapCenter )
                return;

            newMapCenter = new google.maps.LatLng( newMapCenter.lat, newMapCenter.lon );

            scope.mapInstance.setCenter( newMapCenter );
        } );

        scope.mapInstance = new google.maps.Map( $( elem ).children( ".google-map-canvas" )[0], scope.mapInfo );

        if( scope.onMapEditorReady )
            scope.onMapEditorReady( { mapInstance: scope.mapInstance } );

        google.maps.event.addListener( scope.mapInstance, 'click', function ( mouseEvent )
        {
            var southWest = {
                lat: mouseEvent.latLng.lat(),
                lon: mouseEvent.latLng.lng()
            };
            var northEast = {
                lat: mouseEvent.latLng.lat() + 0.01,
                lon: mouseEvent.latLng.lng() + 0.01
            };

            var vertices = [
                southWest,
                { lat: northEast.lat, lon: southWest.lon },
                northEast,
                { lat: southWest.lat, lon: northEast.lon }
            ];

            if( scope.editPolyVerts )
                scope.editPolyVerts.vertices = vertices;
            scope.onEditPolyChange( scope.editPolyVerts );

            //var newShape = createPolygon( map, vertices );

            //newShape.myName = "Name" + ( Math.floor( Math.random() * 10000 ) );

            //google.maps.event.addListener( newShape, 'click', function ()
            //{
            //    $scope.$apply( function ()
            //    {
            //        $scope.geoJsonString = makeGeoJson( newShape );
            //    } );
            //} );
        } );
    };

    return {
        scope: {
            editPolyVerts: "=",
            visiblePolys: "=",
            visiblePoints: "=",
            groupBoundsPoly: "=",
            mapCenter: "=",
            onMapEditorReady: "&",
            enableMapControls: "="
        },
        restrict: 'E',
        replace: 'true',
        templateUrl: '/ngApp/Services/GoogleMapPolyEditorTemplate.html',
        link: linkFunction
    };
}] );
CA.angularApp.directive( "sendMessage", ["$rootScope", "fellowResidents", function ($rootScope, fellowResidents )
{
    function SendMessageController()
    {
        var vm = this;
        vm.shouldShowSendModal = false;
        vm.shouldShowButtons = true;

        // Display the send modal
        vm.showSendModal = function ()
        {
            vm.shouldShowSendModal = true;
            vm.sendResultMessage = "";
            vm.shouldShowButtons = true;

            setTimeout( function ()
            {
                document.getElementById( "message-text-box" ).focus();
            }, 50 );
        }

        // Hide the send modal
        vm.hideModal = function ()
        {
            vm.shouldShowSendModal = false;
            vm.messageBody = "";
        }

        // Send the user's message
        vm.sendMessage = function ()
        {
            vm.shouldShowButtons = false;
            vm.isSending = true;
            vm.sendResultMessage = "";

            fellowResidents.sendMessage( vm.recipientInfo.userId, vm.messageBody ).then( function ( httpResponse )
            {
                vm.isSending = false;
                vm.sendResultIsError = false;
                vm.messageBody = "";
                vm.sendResultMessage = "Message sent successfully!";

            }, function( httpResponse )
            {
                vm.shouldShowButtons = true;
                vm.isSending = false;
                vm.sendResultIsError = true;

                var errorMessage = !!httpResponse.data.exceptionMessage ? httpResponse.data.exceptionMessage : httpResponse.data;
                vm.sendResultMessage = "Failed to send: " + errorMessage;
            } );
        };
    }

    return {
        scope: {
            recipientInfo: "="
        },
        restrict: 'E',
        replace: 'true',
        controllerAs: 'vm',                      
        templateUrl: '/ngApp/services/SendMessageTemplate.html',
        controller: SendMessageController,
        bindToController: true // Needed to hook up the isolate scope to our controller
    };
}] );
// Allow enter key event
// From http://stackoverflow.com/questions/15417125/submit-form-on-pressing-enter-with-angularjs
angular.module( "CondoAlly" ).directive( "ngEnter", function()
{
    return function( scope, element, attrs )
    {
        element.bind( "keydown keypress", function( event )
        {
            var EnterKeyCode = 13;
            if( event.which === EnterKeyCode )
            {
                scope.$apply( function()
                {
                    scope.$eval( attrs.ngEnter, { 'event': event } );
                } );

                event.preventDefault();
            }
        } );
    };
} );

angular.module( "CondoAlly" ).directive( "ngEscape", function()
{
    return function( scope, element, attrs )
    {
        element.bind( "keydown keypress", function( event )
        {
            var EscapeKeyCode = 27;
            if( event.which === EscapeKeyCode )
            {
                scope.$apply( function()
                {
                    scope.$eval( attrs.ngEscape, { 'event': event } );
                } );

                event.preventDefault();
            }
        } );
    };
} );
// Allow conditional inline values
// From http://stackoverflow.com/questions/14164371/inline-conditionals-in-angular-js
CA.angularApp.filter( 'iif', function()
{
    return function( input, trueValue, falseValue )
    {
        return input ? trueValue : falseValue;
    };
} );


CA.angularApp.filter( 'tel', function()
{
    return function( tel )
    {
        if( !tel ) { return ''; }

        var value = tel.toString().trim().replace( /^\+/, '' );

        if( value.match( /[^0-9]/ ) )
        {
            return tel;
        }

        var country, city, number;

        switch( value.length )
        {
            case 7: // ####### -> ###-####
                country = 1;
                city = "";
                number = value;
                break;

            case 10: // +1PPP####### -> C (PPP) ###-####
                country = 1;
                city = value.slice( 0, 3 );
                number = value.slice( 3 );
                break;

            case 11: // +CPPP####### -> CCC (PP) ###-####
                country = value[0];
                city = value.slice( 1, 4 );
                number = value.slice( 4 );
                break;

            case 12: // +CCCPP####### -> CCC (PP) ###-####
                country = value.slice( 0, 3 );
                city = value.slice( 3, 5 );
                number = value.slice( 5 );
                break;

            default:
                city = "";
                return tel;
        }

        // Ignore USA
        if( country === 1 )
            country = "";

        number = number.slice( 0, 3 ) + '-' + number.slice( 3 );

        if( city.length > 0 )
            city = "(" + city + ")";

        return ( country + " " + city + " " + number ).trim();
    };
} );

function TodoCtrl( $http )
{
    var ctrl = this;

    ctrl.todoLists = [];

    ctrl.loadTodos = function()
    {
        ctrl.isLoading = true;

        $http.get( "/api/Todo" ).then( function( httpResponse )
        {
            ctrl.isLoading = false;
            ctrl.todoLists = httpResponse.data;
        } );
    };

    // Create a new to-do list
    ctrl.onAddList = function()
    {
        ctrl.isLoading = true;

        $http.post( "/api/Todo/newList?listName=" + encodeURIComponent( ctrl.newListName ) ).then( function()
        {
            ctrl.isLoading = false;
            ctrl.loadTodos();
        } );
    };

    // Create a new to-do item
    ctrl.onAddItem = function( todoListId )
    {
        ctrl.isLoading = true;

        $http.post( "/api/Todo/newItem/" + todoListId + "?description=" + encodeURIComponent( ctrl.newItemDescription ) ).then( function()
        {
            ctrl.isLoading = false;
            ctrl.newItemDescription = "";
            ctrl.loadTodos();
        } );
    };

    // Mark an item complete
    ctrl.onToggleComplete = function( todoListId, todoItemId )
    {
        ctrl.isLoading = true;

        $http.put( "/api/Todo/toggleComplete/" + todoListId + "/" + todoItemId ).then( function()
        {
            ctrl.isLoading = false;
            ctrl.loadTodos();
        } );
    };

    ctrl.loadTodos();
}

TodoCtrl.$inject = ["$http"];

CA.angularApp.component( "todos", {

    bindings: {},
    templateUrl: "/ngApp/Services/TodoDirectiveTemplate.html",
    controller: TodoCtrl
} );
/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />
var Ally;
(function (Ally) {
    /**
     * Represents an exception returned from an API endpoint
     */
    var ExceptionResult = /** @class */ (function () {
        function ExceptionResult() {
        }
        return ExceptionResult;
    }());
    Ally.ExceptionResult = ExceptionResult;
})(Ally || (Ally = {}));

var AppCacheService = /** @class */ (function () {
    function AppCacheService() {
        // The key for when the user gets redirect for a 401, but is logged in
        this.Key_WasLoggedIn403 = "wasLoggedIn403";
        this.Key_WasLoggedIn401 = "wasLoggedIn401";
        this.Key_AfterLoginRedirect = "afterLoginRedirect";
        this.KeyPrefix = "AppCacheService_";
    }
    AppCacheService.prototype.set = function (key, value) { window.sessionStorage[this.KeyPrefix + key] = value; };
    AppCacheService.prototype.get = function (key) { return window.sessionStorage[this.KeyPrefix + key]; };
    AppCacheService.prototype.clear = function (key) {
        window.sessionStorage[this.KeyPrefix + key] = void 0;
        delete window.sessionStorage[this.KeyPrefix + key];
    };
    AppCacheService.prototype.getAndClear = function (key) {
        var result;
        result = this.get(key);
        this.clear(key);
        return result;
    };
    return AppCacheService;
}());
angular.module("CondoAlly").service("appCacheService", [AppCacheService]);

var Ally;
(function (Ally) {
    /**
     * Represents a column in a CSV spreadsheet
     */
    var CsvColumnDescriptor = /** @class */ (function () {
        function CsvColumnDescriptor() {
        }
        return CsvColumnDescriptor;
    }());
    Ally.CsvColumnDescriptor = CsvColumnDescriptor;
    function ValueToCsvValue(valueObj) {
        if (!valueObj)
            return "";
        var value = valueObj.toString();
        if (HtmlUtil.isNullOrWhitespace(value))
            return "";
        var needsEscaping = value.indexOf('"') !== -1
            || value.indexOf(',') !== -1
            || value.indexOf('\r') !== -1
            || value.indexOf('\n') !== -1;
        if (needsEscaping) {
            // Double the double quotes
            value = value.replace("\"", "\"\"");
            // Wrap the whole thing in quotes
            value = "\"" + value + "\"";
        }
        return value;
    }
    Ally.ValueToCsvValue = ValueToCsvValue;
    /**
     * Generate a CSV for client-side download
     */
    function createCsvString(itemArray, descriptorArray) {
        var csvText = "";
        // Write the header
        for (var i = 0; i < descriptorArray.length; ++i) {
            if (i > 0)
                csvText += ",";
            csvText += ValueToCsvValue(descriptorArray[i].headerText);
        }
        // Write the rows
        for (var rowIndex = 0; rowIndex < itemArray.length; ++rowIndex) {
            csvText += "\n";
            var curRow = itemArray[rowIndex];
            for (var columnIndex = 0; columnIndex < descriptorArray.length; ++columnIndex) {
                if (columnIndex > 0)
                    csvText += ",";
                var curColumn = descriptorArray[columnIndex];
                var columnValue = curRow[curColumn.fieldName];
                if (curColumn.dataMapper)
                    columnValue = curColumn.dataMapper(columnValue);
                csvText += ValueToCsvValue(columnValue);
            }
        }
        return csvText;
    }
    Ally.createCsvString = createCsvString;
})(Ally || (Ally = {}));

var Ally;
(function (Ally) {
    /**
     * Represents a group e-mail address to which e-mails sent get forwarded to the whole group
     */
    var GroupEmailInfo = /** @class */ (function () {
        function GroupEmailInfo() {
        }
        return GroupEmailInfo;
    }());
    Ally.GroupEmailInfo = GroupEmailInfo;
    /**
     * Provides methods to accessing group member and home information
     */
    var FellowResidentsService = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function FellowResidentsService($http, $q, $cacheFactory) {
            this.$http = $http;
            this.$q = $q;
            this.$cacheFactory = $cacheFactory;
        }
        /**
         * Get the residents for the current group
         */
        FellowResidentsService.prototype.getResidents = function () {
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents", { cache: true }).then(function (httpResponse) {
                return httpResponse.data.residents;
            }, function (httpResponse) {
                return innerThis.$q.reject(httpResponse);
            });
        };
        /**
         * Get the residents for an association, broken down by unit for easy display
         */
        FellowResidentsService.prototype.getByUnits = function () {
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents", { cache: true }).then(function (httpResponse) {
                return httpResponse.data.byUnit;
            }, function (httpResponse) {
                return innerThis.$q.reject(httpResponse);
            });
        };
        /**
         * Get a list of residents and homes
         */
        FellowResidentsService.prototype.getByUnitsAndResidents = function () {
            var _this = this;
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents", { cache: true }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return _this.$q.reject(httpResponse);
            });
        };
        /**
         * Get the object describing the available group e-mail addresses
         */
        FellowResidentsService.prototype.getGroupEmailObject = function () {
            var innerThis = this;
            return this.$http.get("/api/BuildingResidents/EmailGroups", { cache: true }).then(function (httpResponse) {
                return httpResponse.data;
            }, function (httpResponse) {
                return this.$q.reject(httpResponse);
            });
            //var innerThis = this;
            //return this.getByUnitsAndResidents().then( function( unitsAndResidents )
            //{
            //    var unitList = unitsAndResidents.byUnit;
            //    var allResidents = unitsAndResidents.residents;
            //    return innerThis.setupGroupEmailObject( allResidents, unitList, null );
            //} );
        };
        /**
         * Populate the lists of group e-mails
         */
        FellowResidentsService.prototype._setupGroupEmailObject = function (allResidents, unitList) {
            var emailLists = {};
            emailLists = {
                everyone: [],
                owners: [],
                renters: [],
                board: [],
                residentOwners: [],
                nonResidentOwners: [],
                residentOwnersAndRenters: [],
                propertyManagers: [],
                discussion: []
            };
            // Go through each resident and add them to each e-mail group they belong to
            for (var i = 0; i < allResidents.length; ++i) {
                var r = allResidents[i];
                var displayName = r.fullName + (r.hasEmail ? "" : "*");
                emailLists.everyone.push(displayName);
                var BoardPos_None = 0;
                var BoardPos_PropertyManager = 32;
                if (r.boardPosition !== BoardPos_None && r.boardPosition !== BoardPos_PropertyManager)
                    emailLists.board.push(displayName);
                if (r.boardPosition === BoardPos_PropertyManager)
                    emailLists.propertyManagers.push(displayName);
                if (r.includeInDiscussionEmail)
                    emailLists.discussion.push(displayName);
                var isOwner = false;
                var isRenter = false;
                var unitIsRented = false;
                for (var unitIndex = 0; unitIndex < r.homes.length; ++unitIndex) {
                    var simpleHome = r.homes[unitIndex];
                    if (!simpleHome.isRenter) {
                        isOwner = true;
                        var unit = _.find(unitList, function (u) { return u.unitId === simpleHome.unitId; });
                        unitIsRented = unit.renters.length > 0;
                    }
                    if (simpleHome.isRenter)
                        isRenter = true;
                }
                if (isOwner) {
                    emailLists.owners.push(displayName);
                    if (unitIsRented)
                        emailLists.nonResidentOwners.push(displayName);
                    else {
                        emailLists.residentOwners.push(displayName);
                        emailLists.residentOwnersAndRenters.push(displayName);
                    }
                }
                if (isRenter) {
                    emailLists.renters.push(displayName);
                    emailLists.residentOwnersAndRenters.push(displayName);
                }
            }
            // If there are no renters then there are no non-residents so hide those lists
            if (emailLists.renters.length === 0) {
                emailLists.residentOwners = [];
                emailLists.residentOwnersAndRenters = [];
                emailLists.nonResidentOwners = [];
            }
            return emailLists;
        };
        /**
         * Send an e-mail message to another user
         */
        FellowResidentsService.prototype.sendMessage = function (recipientUserId, messageBody) {
            var postData = {
                recipientUserId: recipientUserId,
                messageBody: messageBody
            };
            return this.$http.post("/api/BuildingResidents/SendMessage", postData);
        };
        /**
         * Clear cached values, such as when the user changes values in Manage -> Residents
         */
        FellowResidentsService.prototype.clearResidentCache = function () {
            this.$cacheFactory.get("$http").remove("/api/BuildingResidents");
            this.$cacheFactory.get("$http").remove("/api/BuildingResidents/EmailGroups");
        };
        return FellowResidentsService;
    }());
    Ally.FellowResidentsService = FellowResidentsService;
})(Ally || (Ally = {}));
angular.module("CondoAlly").service("fellowResidents", ["$http", "$q", "$cacheFactory", Ally.FellowResidentsService]);

/// <reference path="../../Scripts/typings/googlemaps/google.maps.d.ts" />
var Ally;
(function (Ally) {
    /**
     * Represents an exception returned from an API endpoint
     */
    var ExceptionResult = /** @class */ (function () {
        function ExceptionResult() {
        }
        return ExceptionResult;
    }());
    Ally.ExceptionResult = ExceptionResult;
})(Ally || (Ally = {}));

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    /**
     * The logged-in user's info
     */
    var UserInfo = /** @class */ (function () {
        function UserInfo() {
        }
        return UserInfo;
    }());
    Ally.UserInfo = UserInfo;
    /**
     * Represents the group descriptive information that can only be accessed by a member of the
     * group
     */
    var PrivateSiteInfo = /** @class */ (function () {
        function PrivateSiteInfo() {
        }
        return PrivateSiteInfo;
    }());
    Ally.PrivateSiteInfo = PrivateSiteInfo;
    /**
     * Represents the descriptive information for a CHTN group (condo, HOA, townhome, neighborhood)
     */
    var ChtnPrivateSiteInfo = /** @class */ (function (_super) {
        __extends(ChtnPrivateSiteInfo, _super);
        function ChtnPrivateSiteInfo() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ChtnPrivateSiteInfo;
    }(PrivateSiteInfo));
    Ally.ChtnPrivateSiteInfo = ChtnPrivateSiteInfo;
    /**
     * The current group's site information
     */
    var SiteInfoService = /** @class */ (function () {
        function SiteInfoService() {
            this.publicSiteInfo = {};
            this.privateSiteInfo = new ChtnPrivateSiteInfo();
            this.userInfo = new Ally.UserInfo();
            this.isLoggedIn = false;
        }
        // Retrieve the basic information for the current site
        SiteInfoService.prototype.refreshSiteInfo = function ($rootScope, $http, $q) {
            this._rootScope = $rootScope;
            var deferred = $q.defer();
            $rootScope.isLoadingSite = true;
            var innerThis = this;
            var onSiteInfoReceived = function (siteInfo) {
                $rootScope.isLoadingSite = false;
                innerThis.handleSiteInfo(siteInfo, $rootScope);
                deferred.resolve();
            };
            var onRequestFailed = function () {
                $rootScope.isLoadingSite = false;
                deferred.reject();
            };
            // Retrieve information for the current association
            $http.get("/api/GroupSite").then(function (httpResponse) {
                // If we received data but the user isn't logged-in
                if (httpResponse.data && !httpResponse.data.userInfo) {
                    // Check the cross-domain localStorage for an auth token
                    innerThis.xdLocalStorage.getItem("allyApiAuthToken").then(function (response) {
                        // If we received an auth token then retry accessing the group data
                        if (response && HtmlUtil.isValidString(response.value)) {
                            //console.log( "Received cross domain token:" + response.value );
                            innerThis.setAuthToken(response.value);
                            $http.get("/api/GroupSite").then(function (httpResponse) {
                                onSiteInfoReceived(httpResponse.data);
                            }, onRequestFailed);
                        }
                        else
                            onSiteInfoReceived(httpResponse.data);
                    }, function () {
                        // We failed to get a cross domain token so continue on with what we received
                        onSiteInfoReceived(httpResponse.data);
                    });
                }
                else
                    onSiteInfoReceived(httpResponse.data);
            }, onRequestFailed);
            return deferred.promise;
        };
        ;
        // Returns if a page is for a neutral (public, no login required) page
        SiteInfoService.prototype.testIfIsNeutralPage = function (locationHash) {
            // We only care about Angular paths
            var HashPrefix = "#!/";
            if (!HtmlUtil.startsWith(locationHash, HashPrefix))
                return false;
            // Remove that prefix and add a slash as that's what the menu item stores
            locationHash = "/" + locationHash.substring(HashPrefix.length);
            var menuItem = _.find(AppConfig.menu, function (menuItem) { return menuItem.path === locationHash; });
            return typeof (menuItem) === "object";
        };
        ;
        // Log-in and application start both retrieve information about the current association's site.
        // This function should be used to properly populate the scope with the information.
        SiteInfoService.prototype.handleSiteInfo = function (siteInfo, $rootScope) {
            var subdomain = HtmlUtil.getSubdomain(window.location.host);
            if (!this.authToken && $rootScope.authToken)
                this.setAuthToken($rootScope.authToken);
            // If we're at an unknown subdomain
            if (siteInfo === null || siteInfo === "null") {
                // Allow the user to log-in with no subdomain, create a temp site info object
                var isNeutralSubdomain = subdomain === null || subdomain === "www" || subdomain === "login";
                var isNeutralPage = this.testIfIsNeutralPage(window.location.hash);
                if (isNeutralSubdomain && isNeutralPage) {
                    // Create a default object used to populate a site
                    siteInfo = {};
                    siteInfo.publicSiteInfo =
                        {
                            bgImagePath: "",
                            fullName: AppConfig.appName,
                            //siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to <a style='color:#a3e0ff; text-decoration: underline;' href='https://" + AppConfig.baseTld + "'>" + AppConfig.appName + "</a></span>"
                            siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to " + AppConfig.appName + "</span>"
                        };
                }
                else {
                    // Go to generic login                
                    GlobalRedirect("https://login." + AppConfig.baseTld + "/#!/Login");
                    return;
                }
            }
            // Store the site info to the root scope for access by the app module
            $rootScope.publicSiteInfo = siteInfo.publicSiteInfo;
            this.publicSiteInfo = siteInfo.publicSiteInfo;
            // Handle private (logged-in only) info
            var privateSiteInfo = siteInfo.privateSiteInfo;
            if (!privateSiteInfo)
                privateSiteInfo = {};
            if (privateSiteInfo.gpsPosition && typeof (google) !== "undefined")
                privateSiteInfo.googleGpsPosition = new google.maps.LatLng(privateSiteInfo.gpsPosition.lat, privateSiteInfo.gpsPosition.lon);
            this.privateSiteInfo = privateSiteInfo;
            // Set the site title
            document.title = this.publicSiteInfo.fullName;
            this.userInfo = siteInfo.userInfo;
            $rootScope.userInfo = siteInfo.userInfo;
            if (HtmlUtil.isLocalStorageAllowed())
                window.localStorage.setItem("siteInfo", angular.toJson(this.publicSiteInfo));
            // If the user is logged-in
            this.isLoggedIn = $rootScope.userInfo !== null && $rootScope.userInfo !== undefined;
            $rootScope.isLoggedIn = this.isLoggedIn;
            if (this.isLoggedIn) {
                if (typeof ($zopim) !== "undefined") {
                    $zopim(function () {
                        $zopim.livechat.setName($rootScope.userInfo.firstName + " " + $rootScope.userInfo.lastName);
                        if ($rootScope.userInfo.emailAddress.indexOf("@") !== -1)
                            $zopim.livechat.setEmail($rootScope.userInfo.emailAddress);
                    });
                }
                $rootScope.isAdmin = $rootScope.userInfo.isAdmin;
                $rootScope.isSiteManager = $rootScope.userInfo.isSiteManager;
                // Tell Segment we know who the user is
                if (typeof (analytics) !== "undefined") {
                    analytics.identify($rootScope.userInfo.emailAddress, {
                        name: $rootScope.userInfo.fullName
                    });
                }
            }
            else {
                $rootScope.userInfo = null;
                // If we're not at the log-in page, the get us there
                var LoginPath = "#!/Login";
                if (window.location.hash != LoginPath && !AppConfig.isPublicRoute(window.location.hash)) {
                    // If we're at a valid subdomain
                    if (this.publicSiteInfo && this.publicSiteInfo.baseUrl) {
                        // Need to set the hash "manually" as $location is not available in the config
                        // block and GlobalRedirect will go to the wrong TLD when working locally
                        window.location.hash = LoginPath;
                        //$location.path( "/Login" );
                        //GlobalRedirect( this.publicSiteInfo.baseUrl + loginPath );
                    }
                    else
                        GlobalRedirect(AppConfig.baseUrl + LoginPath);
                }
            }
            // Update the background
            if (!HtmlUtil.isNullOrWhitespace(this.publicSiteInfo.bgImagePath))
                $(document.documentElement).css("background-image", "url(" + $rootScope.bgImagePath + this.publicSiteInfo.bgImagePath + ")");
            // If we need to redirect
            if (this.publicSiteInfo.baseUrl) {
                if ((subdomain === null || subdomain !== this.publicSiteInfo.shortName)
                    && HtmlUtil.isNullOrWhitespace(OverrideBaseApiPath)) {
                    GlobalRedirect(this.publicSiteInfo.baseUrl + "/#!/Home");
                }
            }
        };
        SiteInfoService.prototype.setAuthToken = function (authToken) {
            if (window.localStorage)
                window.localStorage.setItem("ApiAuthToken", authToken);
            this._rootScope.authToken = authToken;
            this.xdLocalStorage.setItem("allyApiAuthToken", authToken).then(function (response) {
                //console.log( "Set cross domain auth token" );
            });
            this.authToken = authToken;
            //appCacheService.clear( appCacheService.Key_AfterLoginRedirect );
        };
        return SiteInfoService;
    }());
    Ally.SiteInfoService = SiteInfoService;
    var SiteInfoHelper = /** @class */ (function () {
        function SiteInfoHelper() {
        }
        SiteInfoHelper.loginInit = function ($q, $http, $rootScope, $sce, xdLocalStorage) {
            var deferred = $q.defer();
            SiteInfoProvider.siteInfo.xdLocalStorage = xdLocalStorage;
            if (SiteInfoProvider.isSiteInfoLoaded) {
                deferred.resolve(SiteInfoProvider.siteInfo);
            }
            else {
                SiteInfoProvider.siteInfo.refreshSiteInfo($rootScope, $http, $q).then(function () {
                    SiteInfoProvider.isSiteInfoLoaded = true;
                    // Used to control the loading indicator on the site
                    $rootScope.isSiteInfoLoaded = true;
                    $rootScope.siteTitle = {
                        text: $rootScope.publicSiteInfo.siteTitleText
                    };
                    // The logo contains markup so use sce to display HTML content
                    if ($rootScope.publicSiteInfo.siteLogo)
                        $rootScope.siteTitle.logoHtml = $sce.trustAsHtml($rootScope.publicSiteInfo.siteLogo);
                    //$rootScope.siteTitleText = $rootScope.publicSiteInfo.siteTitleText;
                    // Occurs when the user saves changes to the site title
                    $rootScope.onUpdateSiteTitleText = function () {
                        analytics.track("updateSiteTitle");
                        $http.put("/api/Settings", { siteTitle: $rootScope.siteTitle.text });
                    };
                    deferred.resolve(SiteInfoProvider.siteInfo);
                });
            }
            return deferred.promise;
        };
        ;
        return SiteInfoHelper;
    }());
    Ally.SiteInfoHelper = SiteInfoHelper;
    var SiteInfoProvider = /** @class */ (function () {
        function SiteInfoProvider() {
        }
        SiteInfoProvider.prototype.$get = function () {
            if (!SiteInfoProvider.isSiteInfoLoaded)
                alert("Not yet loaded!");
            return SiteInfoProvider.siteInfo;
        };
        SiteInfoProvider.isSiteInfoLoaded = false;
        // Use statics because this class is used to resolve the route before the Angular app is
        // allowed to run
        SiteInfoProvider.siteInfo = new Ally.SiteInfoService();
        return SiteInfoProvider;
    }());
    Ally.SiteInfoProvider = SiteInfoProvider;
})(Ally || (Ally = {}));
angular.module('CondoAlly').provider("SiteInfo", Ally.SiteInfoProvider);

function ManageMembersCtrl( $scope, $http, $rootScope, $interval, $http )
{

    var vm = this;

    // Test data
    $scope.members = [];


    $scope.newMember = {
        boardPosition: 0,
        isRenter: false
    };

    $scope.editUser = null;


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Select a member and open a modal to edit their information
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.setEdit = function( member )
    {
        $scope.sentWelcomeEmail = false;

        if( member === null )
        {
            $scope.editUser = null;
            return;
        }

        $scope.editUserForm.$setPristine();

        var copiedMember = jQuery.extend( {}, member );
        $scope.editUser = copiedMember;

        $scope.memberGridOptions.selectAll( false );

        setTimeout( "$( '#edit-user-first-text-box' ).focus();", 100 );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Send a member the welcome e-mail
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onSendWelcome = function()
    {
        $scope.isSavingUser = true;

        $http.put( "/api/Member/" + $scope.editUser.userId + "/SendWelcome" ).then( function()
        {
            $scope.isSavingUser = false;
            $scope.sentWelcomeEmail = true;
        }, function()
        {
            alert( "Failed to send the welcome e-mail, please contact support if this problem persists." )
            $scope.isSavingUser = false;
        } );
    };


    //$scope.memberGridOptions = {
    //    data: 'members'
    //};

    var MembersResource = $resource( '/api/Member', null,
        {
            'update': { method: 'PUT' }
        } );

    var defaultSort = { fields: ['lastName'], directions: ['asc'] };
    var memberSortInfo = defaultSort;
    if( window.localStorage )
    {
        var sortOptions = window.localStorage.getItem( "memberSort" );
        if( sortOptions )
            memberSortInfo = JSON.parse( sortOptions );

        if( memberSortInfo.fields.length === 0 )
            memberSortInfo = defaultSort;

        // Store the grid's sort state every 2 seconds to maintain whatever was last selected.
        // Why not just when the sort changes?
        $interval( function()
        {
            var simpleSortInfo = { fields: $scope.memberGridOptions.sortInfo.fields, directions: $scope.memberGridOptions.sortInfo.directions };
            window.localStorage.setItem( "memberSort", JSON.stringify( simpleSortInfo ) );
        }, 2000 );
    }

    $scope.memberGridOptions =
    {
        data: "members",
        plugins: [new ngGridFlexibleHeightPlugin()],
        columnDefs:
        [
            { field: 'firstName', displayName: 'First Name', cellClass: "resident-cell-first" },
            { field: 'lastName', displayName: 'Last Name', cellClass: "resident-cell-last" },
            { field: 'email', displayName: 'E-mail', cellClass: "resident-cell-email" },
            { field: 'isSiteManager', displayName: 'Admin', width: 60, cellClass: "resident-cell-site-manager", cellTemplate: '<div style="text-align:center; padding-top: 8px;"><input type="checkbox" disabled="disabled" ng-checked="row.getProperty(col.field)"></div>' },
            { field: 'phoneNumber', displayName: 'Phone Number', width: 150, cellClass: "resident-cell-phone", cellTemplate: '<div class="ngCellText" ng-class="col.colIndex()"><span ng-cell-text>{{ row.getProperty(col.field) | tel }}</span></div>' },
        ],
        afterSelectionChange: function( rowItem )
        {
            if( rowItem.selected )
                $scope.setEdit( rowItem.entity );
        },
        sortInfo: memberSortInfo,
        multiSelect: false
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the members
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.refresh = function()
    {
        $scope.isLoading = true;

        $http.get( "/api/Member" ).then( function( httpResponse )
        {
            $scope.members = httpResponse.data;

            // Hide e-mail address that are @condoally.com that indicates no e-mail address is
            // set
            _.forEach( $scope.members, function( res )
            {
                res.fullName = res.firstName + " " + res.lastName;
                if( typeof ( res.email ) === "string" && res.email.indexOf( "@condoally.com" ) !== -1 )
                    res.email = "";
            } );

            $scope.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to update a member's information or create a new
    // member
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onSaveMember = function()
    {
        if( $scope.editUser == null )
            return;

        $( "#editUserForm" ).validate();
        if( !$( "#editUserForm" ).valid() )
            return;

        $scope.isSavingUser = true;

        var onSave = function()
        {
            $scope.editUser = null;
            $scope.isSavingUser = false;
            $scope.refresh();
        };

        var onError = onSave;

        if( !$scope.editUser.userId )
            $http.post( "/api/Member", $scope.editUser ).then( onSave, onError );
        else
            $http.put( "/api/Member", $scope.editUser ).then( onSave, onError );

        // TODO Update the fellow residents page next time we're there
        // $cacheFactory.get('$http').remove("/api/BuildingResidents");
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to set a user's password
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.OnAdminSetPassword = function()
    {
        var setPass =
            {
                userName: $scope.adminSetPass_Username,
                password: $scope.adminSetPass_Password
            };

        $http.post( "/api/AdminHelper/SetPassword", setPass ).then( function( httpResponse )
        {
            $scope.adminSetPass_ResultMessage = httpResponse.data;
        }, function()
        {
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to delete a resident
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onDeleteMember = function()
    {
        if( !confirm( "Are you sure you want to remove this person from your neighborhood watch group?" ) )
            return;

        $http.delete( "/api/Member", { userId: $scope.editUser.userId, unitId: $scope.editUser.unitId } ).then( function()
        {
            $scope.editUser = null;
            $scope.refresh();
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user presses the button to reset everyone's password
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onSendAllWelcome = function()
    {
        $scope.isLoading = true;

        $http.put( "/api/Member?userId&action=launchsite" ).then( function()
        {
            $scope.isLoading = false;
            $scope.sentWelcomeEmail = true;
            $scope.allEmailsSent = true;
        }, function()
        {
            alert( "Failed to send welcome e-mail, please contact support if this problem persists." )
            $scope.isLoading = false;
        } );
    };

    $scope.refresh();
}
ManageMembersCtrl.$inject = ['$scope', '$http', '$rootScope', '$interval', '$http'];
function WatchSettingsCtrl($http, $rootScope, $resource, SiteInfo)
{
    var vm = this;

    // Test data
    vm.settings = {};

    vm.defaultBGImage = $( document.documentElement ).css( "background-image" );

    vm.showQaButton = $rootScope.userInfo.emailAddress === "president@mycondoally.com";
    

    var SettingsResource = $resource( '/api/Settings', null,
        {
            'update': { method: 'PUT' }
        } );


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the page from the server
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.refreshData = function()
    {
        vm.isLoading = true;

        vm.settings = SettingsResource.get( function()
        {
            vm.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to save a new site title
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.onSiteTitleChange = function()
    {
        vm.isLoading = true;

        SettingsResource.update( { siteTitle: vm.settings.siteTitle }, function()
        {
            location.reload();
            vm.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to save a new welcome message
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.onWelcomeMessageUpdate = function()
    {
        vm.isLoading = true;

        SettingsResource.update( { welcomeMessage: vm.settings.welcomeMessage }, function()
        {
            SiteInfo.privateSiteInfo.welcomeMessage = vm.settings.welcomeMessage;
            vm.isLoading = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user clicks a new background image
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.onImageClick = function( bgImage )
    {
        vm.settings.bgImageFileName = bgImage;
        SettingsJS._defaultBG = bgImage;

        SettingsResource.update( { BGImageFileName: vm.settings.bgImageFileName }, function()
        {
            $( ".test-bg-image" ).removeClass( "test-bg-image-selected" );

            $( "img[src='" + $rootScope.bgImagePath + bgImage + "']" ).addClass( "test-bg-image-selected" );

            vm.isLoading = false;
        } );
    };


    vm.onImageHoverOver = function( bgImage )
    {
        $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + bgImage + ")" );
    };


    vm.onImageHoverOut = function()
    {
        if( typeof ( vm.settings.bgImageFileName ) === "string" && vm.settings.bgImageFileName.length > 0 )
            $( document.documentElement ).css( "background-image", "url(" + $rootScope.bgImagePath + vm.settings.bgImageFileName + ")" );
        else
            $( document.documentElement ).css( "background-image", vm.defaultBGImage );
    };


    vm.onQaDeleteSite = function()
    {
        $http.get( "/api/QA/DeleteThisAssociation" ).then( function()
        {
            location.reload();
        }, function( httpResponse )
        {
            alert( "Failed to delete site: " + httpResponse.data.message );
        } );
    };

    vm.mapInstance = new google.maps.Map( document.getElementById( 'map-canvas' ), vm.mapInfo );


    vm.refreshData();
}

WatchSettingsCtrl.$inject = ["$http", "$rootScope", "$resource", "SiteInfo"];

function WatchCalendarCtrl( $scope, $timeout, $http, $rootScope, $q ) {

    var vm = this;

    var calendarEvents = [];

    var DateFormat = "YYYY-MM-DD";
    var TimeFormat = "h:mma";

    var NoTime = "12:37am";

    $scope.today = new Date();

    var getCalendarEvents = function ( start, end, timezone, callback ) {
        $scope.isLoadingCalendarEvents = true;

        var firstDay = start.format( DateFormat );
        var lastDay = end.format( DateFormat );

        $http.get( "/api/CalendarEvent?startDate=" + firstDay + "&endDate=" + lastDay ).then( function ( httpResponse ) {
            var associationEvents = [];

            var data = httpResponse.data;

            $scope.isLoadingCalendarEvents = false;

            _.each( data, function ( entry ) {
                entry.timeOnly = moment.utc( entry.date ).format( TimeFormat );
                entry.dateOnly = entry.date;

                if ( entry.timeOnly == NoTime )
                    entry.timeOnly = "";

                var shortText = entry.title;
                if ( shortText.length > 17 )
                    shortText = shortText.substring( 0, 17 ) + "...";

                var fullDescription = "Posted by: " + entry.authorName + "<br><p>" + entry.title + "</p>";

                associationEvents.push( {
                    title: shortText,
                    start: entry.date.substring( 0, 10 ), // 10 = length of YYYY-MM-DD
                    toolTipTitle: "Event",
                    fullDescription: fullDescription,
                    calendarEventObject: entry
                } );
            } );

            callback( associationEvents );

        }, function () {
            $scope.isLoadingCalendarEvents = false;
        } );
    };

    /* config object */
    var uiConfig = {
        height: 600,
        editable: false,
        header: {
            left: 'month agendaWeek',
            center: 'title',
            right: 'today prev,next'
        },
        viewRender: function ( view, element ) {
            if ( $rootScope.isSiteManager )
                $( element ).css( "cursor", "pointer" );
        },
        dayClick: function ( date ) {
            if ( !$rootScope.isSiteManager )
                return;

            // The date is wrong if time zone is considered
            var clickedDate = moment( moment.utc( date ).format( DateFormat ) ).toDate();

            $scope.$apply( function () {
                $scope.setEditEvent( { date: clickedDate, dateOnly: clickedDate, associatedUserIds: [] } );
            } );
        },
        eventClick: function ( event ) {
            $scope.$apply( function () {
                if ( event.calendarEventObject ) {
                    $scope.setEditEvent( event.calendarEventObject, true );
                }
            } );
        },
        eventRender: function ( event, element ) {
            $( element ).css( "cursor", "default" );

            $( element ).qtip( {
                style: {
                    classes: 'qtip-light qtip-shadow'
                },
                content: {
                    text: event.fullDescription,
                    title: event.toolTipTitle
                }
            } );
        },
        eventSources: [{
            events: getCalendarEvents
        }]
    };


    $( document ).ready( function () {
        $( '.EditableEntry' ).editable( '<%= Request.Url %>',
        {
            id: 'EditEntryId',
            type: 'textarea',
            cancel: 'Cancel',
            submit: 'Ok'
        } );

        //$( ".collapsibleContainer" ).collapsiblePanel();

        $( '#log-calendar' ).fullCalendar( uiConfig );
    } );


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user clicks a user in the calendar event modal
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onResidentClicked = function ( userId ) {
        var alreadyExists = _.contains( $scope.editEvent.associatedUserIds, userId );

        if ( alreadyExists )
            $scope.editEvent.associatedUserIds = _.without( $scope.editEvent.associatedUserIds, userId );
        else
            $scope.editEvent.associatedUserIds.push( userId );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Returns if a specific user's ID is associated with the currently selected event
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.isUserAssociated = function ( userId )
    {
        if ( $scope.editEvent && $scope.editEvent.associatedUserIds )
            return _.contains( $scope.editEvent.associatedUserIds, userId );

        return false;
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Show the full calendar event edit modal
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.expandCalendarEventModel = function () {
        $scope.showExpandedCalendarEventModel = true;

        //TODO Animate this?
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Set the calendar event for us to edit
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.setEditEvent = function ( eventObject, showDetails ) {
        $scope.showExpandedCalendarEventModel = showDetails || false;
        $scope.editEvent = eventObject;

        // Set focus on the title so it's user friendly and ng-escape needs an input focused to
        // work
        if ( eventObject )
            setTimeout( function () { $( "#calendar-event-title" ).focus(); }, 10 );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Delete the calendar event that's being viewed
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.deleteCalendarEvent = function ( eventId ) {
        if ( !confirm( "Are you sure you want to remove this calendar event?" ) )
            return;

        $scope.isLoadingCalendarEvents = true;

        $http.delete( "/api/CalendarEvent?eventId=" + eventId ).then( function () {
            $scope.isLoadingCalendarEvents = false;

            $scope.editEvent = null;

            $scope.onlyRefreshCalendarEvents = true;
            $( '#log-calendar' ).fullCalendar( 'refetchEvents' );
        }, function () {
            $scope.isLoadingCalendarEvents = false;
            alert( "Failed to delete the calendar event." );
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Save the calendar event that's being viewed
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.saveCalendarEvent = function () {
        var dateTimeString = "";
        if ( typeof ( $scope.editEvent.timeOnly ) === "string" && $scope.editEvent.timeOnly.length > 1 )
            dateTimeString = moment.utc( $scope.editEvent.date ).format( DateFormat ) + " " + $scope.editEvent.timeOnly;
        else
            dateTimeString = moment.utc( $scope.editEvent.date ).format( DateFormat ) + " " + NoTime;

        $scope.editEvent.date = moment.utc( dateTimeString, DateFormat + " " + TimeFormat ).toDate();

        var httpFunc;
        if ( $scope.editEvent.eventId )
            httpFunc = $http.put;
        else
            httpFunc = $http.post;

        $scope.isLoadingCalendarEvents = true;

        httpFunc( "/api/CalendarEvent", $scope.editEvent ).then( function () {
            $scope.isLoadingCalendarEvents = false;
            $scope.editEvent = null;

            $scope.onlyRefreshCalendarEvents = true;
            $( '#log-calendar' ).fullCalendar( 'refetchEvents' );
        }, function () {
            $scope.isLoadingCalendarEvents = false;
        } );
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Occurs when the user wants to delete a news item
    ///////////////////////////////////////////////////////////////////////////////////////////////
    $scope.onDeleteItem = function ( item ) {
        if ( !confirm( 'Are you sure you want to delete this information?' ) )
            return;

        $scope.isLoading = true;

        LogEntryResource.delete( { logEntryId: item.logEntryId }, function () {
            $scope.RetrieveItems();
        } );
    };
    
    $( '#calendar-event-time' ).timepicker( { 'scrollDefault': '10:00am' } );
}
WatchCalendarCtrl.$inject = ['$scope', '$timeout', '$http', '$rootScope', "$q"];
function WatchHomeCtrl($rootScope, $resource, SiteInfo)
{
    var vm = this;

    var WatchMembersResource = $resource( '/api/Watch/Home' );
    var LocalNewsResource = $resource( 'https://localnewsally.org/api/LocalNews', null, { cache: true } );


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the page from the server
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.refreshData = function()
    {
        vm.isLoading = true;

        vm.watchMembers = WatchMembersResource.get( function()
        {            
            vm.isLoading = false;
        } );
    };

    LocalNewsResource.query( {
        clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
        chicagoWard: SiteInfo.publicSiteInfo.chicagoWard,
        zipCode: SiteInfo.publicSiteInfo.zipCode,
        cityNeighborhood: SiteInfo.publicSiteInfo.localNewsNeighborhoodQuery
    }, function ( localNews )
    {
        vm.localNews = localNews;
        //console.log(localNews);
        vm.isLoading_LocalNews = false;
    } );
}

WatchHomeCtrl.$inject = ["$rootScope", "$resource", "SiteInfo"];
function WatchMembersCtrl( $rootScope, $resource, SiteInfo )
{
    var vm = this;

    var WatchMembersResource = $resource( '/api/Watch/MemberList' );
    
    
    var getHousePolys = function ( memberList )
    {
        var usedAddressIds = [];
        var housePolys = [];

        _.each( memberList, function ( m )
        {
            if ( !m.houseGpsBounds )
                return;

            var addressHasAlreadyBeenAdded = _.some( usedAddressIds, function ( id ) { return id == m.addressId; } );
            if ( addressHasAlreadyBeenAdded )
                return;

            usedAddressIds.push( m.addressId );
            housePolys.push( m.houseGpsBounds );
        } );

        return housePolys;
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////
    // Populate the page from the server
    ///////////////////////////////////////////////////////////////////////////////////////////////
    vm.refreshData = function () {
        vm.isLoading = true;

        vm.memberList = WatchMembersResource.query( function () {
            vm.isLoading = false;
            
            vm.housePolys = getHousePolys( vm.memberList );
        } );
    };

    vm.mapCenter = SiteInfo.privateSiteInfo.gpsPosition;
    vm.groupBounds = SiteInfo.publicSiteInfo.gpsBounds;

    //var debugKey = "AIzaSyD5fTq9-A3iDFpPSUtRR0Qr38l-xl694b0";
    //var releaseKey = "AIzaSyCiRqxdfryvJirNOjZlQIFwYhHXNAoDtHI";

    //var script = document.createElement( 'script' );
    //script.type = 'text/javascript';
    //script.src = "https://maps.googleapis.com/maps/api/js?sensor=false&key=" + debugKey + "&callback=WelcomeJS.onMapApiLoaded";
    //document.body.appendChild( script );

    vm.refreshData();
}

WatchMembersCtrl.$inject = [ "$rootScope", "$resource", "SiteInfo" ];