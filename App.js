import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, TextInput } from 'react-native';
import { getCompanies, getCompanyLocations, getCompanyAssets } from './src/api';

// Importando os ícones
import locationIcon from './assets/icons/location.png';
import assetIcon from './assets/icons/asset.png';
import componentIcon from './assets/icons/component.png';

const App = () => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showEnergySensors, setShowEnergySensors] = useState(false);
  const [showCriticalStatus, setShowCriticalStatus] = useState(false);

  useEffect(() => {
    const fetchCompanies = async () => {
      const response = await getCompanies();
      setCompanies(response.data);
    };

    fetchCompanies();
  }, []);

  const handleCompanySelect = async (companyId) => {
    const locationsResponse = await getCompanyLocations(companyId);
    const assetsResponse = await getCompanyAssets(companyId);

    const tree = buildTree(locationsResponse.data, assetsResponse.data);
    setTreeData(tree);
    setFilteredData(tree);
    setSelectedCompany(companyId);
  };

  const buildTree = (locations, assets) => {
    const locationMap = {};
    const assetMap = {};

    locations.forEach(location => {
      locationMap[location.id] = { ...location, type: 'location', children: [] };
    });

    assets.forEach(asset => {
      assetMap[asset.id] = { ...asset, type: asset.sensorType ? 'component' : 'asset', children: [] };
    });

    const root = { id: 'root', name: 'Root', type: 'root', children: [] };

    locations.forEach(location => {
      if (location.parentId) {
        locationMap[location.parentId].children.push(locationMap[location.id]);
      } else {
        root.children.push(locationMap[location.id]);
      }
    });

    assets.forEach(asset => {
      if (asset.parentId) {
        assetMap[asset.parentId].children.push(assetMap[asset.id]);
      } else if (asset.locationId) {
        locationMap[asset.locationId].children.push(assetMap[asset.id]);
      } else {
        root.children.push(assetMap[asset.id]);
      }
    });

    return [root];
  };

  const applyFilters = () => {
    let filtered = [...treeData];

    // Apply text search filter
    if (searchText) {
      filtered = filterTreeByText(filtered, searchText);
    }

    // Apply energy sensors filter
    if (showEnergySensors) {
      filtered = filterTreeByEnergySensors(filtered);
    }

    // Apply critical status filter
    if (showCriticalStatus) {
      filtered = filterTreeByCriticalStatus(filtered);
    }

    setFilteredData(filtered);
  };

  const filterTreeByText = (nodes, text) => {
    return nodes.reduce((acc, node) => {
      if (node.name.toLowerCase().includes(text.toLowerCase())) {
        acc.push(node);
      } else if (node.children) {
        const filteredChildren = filterTreeByText(node.children, text);
        if (filteredChildren.length) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };

  const filterTreeByEnergySensors = (nodes) => {
    return nodes.reduce((acc, node) => {
      if (node.sensorType === 'energy') {
        acc.push(node);
      } else if (node.children) {
        const filteredChildren = filterTreeByEnergySensors(node.children);
        if (filteredChildren.length) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };

  const filterTreeByCriticalStatus = (nodes) => {
    return nodes.reduce((acc, node) => {
      if (node.status === 'critical') {
        acc.push(node);
      } else if (node.children) {
        const filteredChildren = filterTreeByCriticalStatus(node.children);
        if (filteredChildren.length) {
          acc.push({ ...node, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  };

  const renderTree = (node) => (
    <View key={node.id} style={styles.node}>
      <TouchableOpacity style={styles.nodeContent}>
        <Image source={getIconSource(node.type)} style={styles.icon} />
        <Text style={styles.nodeText}>{node.name}</Text>
      </TouchableOpacity>
      {node.children && (
        <View style={styles.childrenContainer}>
          {node.children.map((child) => renderTree(child))}
        </View>
      )}
    </View>
  );

  const getIconSource = (type) => {
    switch (type) {
      case 'location':
        return locationIcon;
      case 'asset':
        return assetIcon;
      case 'component':
        return componentIcon;
      default:
        return null;
    }
  };

  useEffect(() => {
    applyFilters();
  }, [searchText, showEnergySensors, showCriticalStatus]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asset Tree Viewer</Text>
      {!selectedCompany ? (
        <FlatList
          data={companies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleCompanySelect(item.id)} style={styles.companyButton}>
              <Text style={styles.companyText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <ScrollView>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchText}
            onChangeText={setSearchText}
          />
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, showEnergySensors && styles.filterButtonActive]}
              onPress={() => setShowEnergySensors(!showEnergySensors)}
            >
              <Text style={styles.filterButtonText}>Energy Sensors</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, showCriticalStatus && styles.filterButtonActive]}
              onPress={() => setShowCriticalStatus(!showCriticalStatus)}
            >
              <Text style={styles.filterButtonText}>Critical Status</Text>
            </TouchableOpacity>
          </View>
          <View>{filteredData.map((node) => renderTree(node))}</View>
        </ScrollView>
      )}
    </View>
  );
};

// Estilos para o componente App
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 20, // Adiciona espaçamento superior ao título
  },
  companyButton: {
    padding: 10,
    backgroundColor: '#ddd',
    marginBottom: 10,
    borderRadius: 5,
  },
  companyText: {
    fontSize: 16,
  },
  node: {
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderColor: '#ccc',
  },
  nodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  nodeText: {
    marginLeft: 5,
    fontSize: 14,
  },
  childrenContainer: {
    paddingLeft: 10,
  },
  icon: {
    width: 20,
    height: 20,
  },
  searchInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#ddd',
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#aaa',
  },
  filterButtonText: {
    fontSize: 14,
  },
});

export default App;
