import { overpassRequestURL } from './cyclingPointsRequests'
import { shuffleArray } from './utils'
import booleanContains from '@turf/boolean-contains'
import point from 'turf-point'
import { polygon } from '@turf/helpers'
import center from '@turf/center'
import { createTurfPointCollection } from './cyclingGeoStudio'

export const APIUrl = `http://localhost:3000/`
export const pointsRequest = async (city, randomFilter = 100) => {
	try {
		const townhallResponse = await fetch(`${APIUrl}points/${city}/townhalls`),
			townhallPoints = await townhallResponse.json(),
			townhalls = clusterTownhallBorders(townhallPoints.elements)

		const transportStopsResponse = await fetch(APIUrl + `points/${city}/stops`),
			transportStopsRaw = await transportStopsResponse.json(),
			transportStops = shuffleArray(transportStopsRaw.elements).slice(
				0,
				randomFilter
			)
		const points = [...townhalls, ...transportStops]
		return points
	} catch (e) {
		throw new Error('Problème de téléchargement des points cyclables' + e)
	}
}

export const pointsProcess = async (ville, randomFilter) => {
	const worldPoints = await pointsRequest(ville, randomFilter)

	const points = /^\d+$/.test(ville) // If it's an ID, it's unique, we don't need to filter for points only present in France
		? worldPoints
		: worldPoints.filter((p) =>
				booleanContains(
					polygon([[...metropolitanFrance, metropolitanFrance.at(0)]]),
					point([p.lon, p.lat])
				)
		  )
	console.log({ worldPoints, points })
	return points
}

export const computePointsCenter = (points) =>
	center(createTurfPointCollection(points))

export const clusterTownhallBorders = (elements) =>
	elements
		.filter((element) => element.tags && element.tags['amenity'] === 'townhall')
		.map((element) => {
			if (element.type === 'way') {
				const firstNode = elements.find((node) => node.id === element.nodes[0])
				return { ...element, lat: firstNode.lat, lon: firstNode.lon }
			}
			if (element.type === 'relation') {
				const firstRef = elements.find(
					(node) => node.id === element.members[0].ref
				)
				const firstNode = elements.find((node) => node.id === firstRef.nodes[0])
				return { ...element, lat: firstNode.lat, lon: firstNode.lon }
			}
			return element
		})

// the Paris query can return points in the united states ! Hence we test the containment.
// Hack, breaks Corsica and Outre mer :/
// (bikes don't exist in Corsica anyway yet)
const metropolitanFrance = [
	[-5.353852828534542, 48.42923941831151],
	[2.5964340170922924, 51.97021507483498],
	[8.734619911467632, 49.03027507341659],
	[10.345413967223578, 41.03091304244174],
	[-2.447427130244762, 42.92290589918966],
]